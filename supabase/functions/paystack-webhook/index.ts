import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacSha512Hex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPaystackSignature(
  body: string,
  header: string | null,
  secret: string
): Promise<boolean> {
  if (!header || !secret) return false;
  const expected = await hmacSha512Hex(secret, body);
  return timingSafeEqual(expected, header.trim().toLowerCase());
}

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

async function resolveEnrollmentContext(
  admin: SupabaseClient,
  enrollmentId: string
): Promise<{ email: string | null; courseTitle: string } | null> {
  const { data: enrollment } = await admin
    .from("enrollments")
    .select("id, user_id, cohort_id")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (!enrollment) return null;

  const [{ data: profile }, { data: cohort }] = await Promise.all([
    admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", enrollment.user_id)
      .maybeSingle(),
    admin
      .from("cohorts")
      .select("name, course:courses (title)")
      .eq("id", enrollment.cohort_id)
      .maybeSingle(),
  ]);

  const course = Array.isArray(cohort?.course)
    ? (cohort?.course as unknown as { title?: string }[])[0]
    : (cohort?.course as unknown as { title?: string } | null);

  return {
    email: profile?.email ?? null,
    courseTitle: course?.title ?? "your course",
  };
}

type PaystackEvent = {
  event: string;
  data: {
    id?: number;
    amount?: number;
    currency?: string;
    receipt_url?: string;
    reference?: string;
    metadata?: Record<string, string | undefined> | null;
    transaction?: { reference?: string };
  };
};

export default async function handler(req: Request): Promise<Response> {
  const { headers, preflight } = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, headers);
  }

  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secret) {
    return jsonResponse(
      { error: "Webhook secret not configured" },
      500,
      headers
    );
  }

  const body = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  const valid = await verifyPaystackSignature(body, signature, secret);
  if (!valid) {
    return jsonResponse({ error: "Invalid signature" }, 400, headers);
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(body) as PaystackEvent;
  } catch {
    return jsonResponse({ error: "Invalid payload" }, 400, headers);
  }

  const admin = createServiceClient();

  switch (event.event) {
    case "charge.success": {
      const data = event.data;
      const metadata = data.metadata ?? {};

      if (!metadata.enrollment_id) break;

      await admin
        .from("enrollments")
        .update({
          status: "active",
          reserved_until: null,
        })
        .eq("id", metadata.enrollment_id);

      await admin
        .from("payments")
        .update({
          status: "completed",
          gateway_payment_id: String(data.id),
          gateway_receipt_url: data.receipt_url || null,
        })
        .eq("gateway_session_id", data.reference);

      await admin.rpc("create_notification", {
        p_user_id: metadata.user_id,
        p_type: "enrollment_confirmed",
        p_title: "Enrollment Confirmed!",
        p_body: "Your payment was successful. Welcome to the course!",
        p_link: `/dashboard`,
        p_cohort_id: metadata.cohort_id,
      });

      await admin.rpc("log_audit", {
        p_actor_id: metadata.user_id,
        p_action: "enrollment.activated",
        p_entity_type: "enrollment",
        p_entity_id: metadata.enrollment_id,
        p_details: {
          gateway: "paystack",
          amount: (data.amount || 0) / 100,
          reference: data.reference,
        },
      });

      try {
        const context = await resolveEnrollmentContext(
          admin,
          metadata.enrollment_id
        );
        if (context?.email) {
          await sendEmail(
            context.email,
            `Enrollment confirmed — ${context.courseTitle}`,
            `<!doctype html><html><body style="font-family:sans-serif">
<p>Your payment was successful. Welcome to <strong>${escapeHtml(
              context.courseTitle
            )}</strong>!</p>
<p>Amount: ${((data.amount || 0) / 100).toFixed(2)} ${escapeHtml(
              String(data.currency || "GHS")
            )}</p>
</body></html>`
          );
        }
      } catch (err) {
        console.error(
          "Enrollment confirmation email failed:",
          err instanceof Error ? err.message : "unknown"
        );
      }

      break;
    }

    case "refund.processed": {
      const data = event.data;
      const reference = data.transaction?.reference;

      if (reference) {
        const { data: payment } = await admin
          .from("payments")
          .select("id, enrollment_id, user_id")
          .eq("gateway_session_id", reference)
          .single();

        if (payment) {
          await admin
            .from("payments")
            .update({
              status: "refunded",
              refund_amount: (data.amount || 0) / 100,
              refunded_at: new Date().toISOString(),
            })
            .eq("id", payment.id);

          await admin
            .from("enrollments")
            .update({ status: "refunded" })
            .eq("id", payment.enrollment_id);

          await admin.rpc("create_notification", {
            p_user_id: payment.user_id,
            p_type: "refund_processed",
            p_title: "Refund Processed",
            p_body: `Your refund has been processed.`,
          });

          try {
            const { data: profile } = await admin
              .from("profiles")
              .select("email")
              .eq("id", payment.user_id)
              .maybeSingle();

            if (profile?.email) {
              await sendEmail(
                profile.email,
                "Refund processed",
                `<!doctype html><html><body style="font-family:sans-serif">
<p>Your refund of ${((data.amount || 0) / 100).toFixed(2)} ${escapeHtml(
                  String(data.currency || "GHS")
                )} has been processed.</p>
<p>Course access has been revoked.</p>
</body></html>`
              );
            }
          } catch (err) {
            console.error(
              "Refund email failed:",
              err instanceof Error ? err.message : "unknown"
            );
          }
        }
      }
      break;
    }
  }

  return jsonResponse({ received: true }, 200, headers);
}
