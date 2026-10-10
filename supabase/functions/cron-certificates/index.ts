import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  createServiceClient,
  verifyCronAuth,
} from "../_shared/supabase.ts";
import { checkAndIssueCertificate } from "../_shared/certificates.ts";

const BATCH_SIZE = 100;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM_EMAIL") || "noreply@startech.com",
        to: [to],
        subject,
        html,
      }),
    });
  } catch (err) {
    console.error(
      "Email send failed:",
      err instanceof Error ? err.message : "unknown"
    );
  }
}

function certificateHtml(params: {
  studentName: string;
  courseTitle: string;
  certificateNumber: string;
  verifyUrl: string;
  linkedinUrl: string;
}): string {
  return `<!doctype html><html><body style="font-family:sans-serif">
<p>Congratulations ${escapeHtml(params.studentName)}!</p>
<p>You earned a certificate for <strong>${escapeHtml(
    params.courseTitle
  )}</strong>.</p>
<p>Certificate No. ${escapeHtml(params.certificateNumber)}</p>
<p><a href="${escapeHtml(params.verifyUrl)}">Verify this certificate</a></p>
<p><a href="${escapeHtml(params.linkedinUrl)}">Add to LinkedIn</a></p>
</body></html>`;
}

export default async function handler(req: Request): Promise<Response> {
  const { headers, preflight } = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, headers);
  }

  if (!verifyCronAuth(req)) {
    return jsonResponse({ error: "Unauthorized" }, 401, headers);
  }

  const admin = createServiceClient();

  const { data: enrollments, error } = await admin
    .from("enrollments")
    .select("id, user_id")
    .eq("status", "active")
    .limit(BATCH_SIZE);

  if (error) {
    return jsonResponse({ error: error.message }, 500, headers);
  }

  let issued = 0;
  const issuedNumbers: string[] = [];
  const errors: string[] = [];

  for (const enrollment of enrollments ?? []) {
    try {
      const result = await checkAndIssueCertificate(admin, enrollment.id);
      if (!result.issued) continue;

      issued += 1;
      issuedNumbers.push(result.issued.certificate_number);

      const { data: profile } = await admin
        .from("profiles")
        .select("email")
        .eq("id", enrollment.user_id)
        .single();

      if (profile?.email) {
        await sendEmail(
          profile.email,
          `Your certificate for ${result.issued.course_title}`,
          certificateHtml(result.issued)
        );
      }

      await admin.rpc("create_notification", {
        p_user_id: enrollment.user_id,
        p_type: "certificate_issued",
        p_title: "Certificate issued 🎓",
        p_body: `You earned a certificate for ${result.issued.course_title}.`,
        p_link: "/dashboard",
      });

      await admin.rpc("log_audit", {
        p_actor_id: enrollment.user_id,
        p_action: "certificate.issued",
        p_entity_type: "certificate",
        p_entity_id: result.issued.id,
        p_details: { certificate_number: result.issued.certificate_number },
      });
    } catch (err) {
      errors.push(
        `${enrollment.id}: ${
          err instanceof Error ? err.message : "failed"
        }`
      );
    }
  }

  return jsonResponse(
    { checked: enrollments?.length ?? 0, issued, issuedNumbers, errors },
    200,
    headers
  );
}
