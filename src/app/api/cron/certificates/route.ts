import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CRON_UNAUTHORIZED, verifyCronSecret } from "@/lib/cron";
import { checkAndIssueCertificate } from "@/lib/certificates";
import { sendCertificateIssuedEmail } from "@/lib/email/client";

const BATCH_SIZE = 100;

/**
 * POST /api/cron/certificates
 * Checks every active enrollment against its course's certificate rules and
 * issues certificates for those that now qualify.
 */
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json(CRON_UNAUTHORIZED.json, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: enrollments, error } = await admin
    .from("enrollments")
    .select("id, user_id")
    .eq("status", "active")
    .limit(BATCH_SIZE);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
        await sendCertificateIssuedEmail(profile.email, {
          studentName: result.issued.student_name,
          courseTitle: result.issued.course_title,
          certificateNumber: result.issued.certificate_number,
          verifyUrl: result.issued.verify_url,
          linkedinUrl: result.issued.linkedin_url,
        });
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
        `${enrollment.id}: ${err instanceof Error ? err.message : "failed"}`
      );
    }
  }

  return NextResponse.json({
    checked: enrollments?.length ?? 0,
    issued,
    issuedNumbers,
    errors,
  });
}
