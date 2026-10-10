import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCertificatePdf } from "@/lib/pdf";

/**
 * GET /api/certificates/generate?id=<uuid|number>
 *
 * Returns the certificate PDF. Certificates are public documents (they are
 * designed to be shared and verified), so anyone may download a non-revoked
 * certificate; revoked ones are owner/admin only.
 */
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Missing certificate id" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id
      );

    const { data: certificate } = await supabase
      .from("certificates")
      .select(
        "id, user_id, certificate_number, student_name, course_title, cohort_name, completion_data, issued_at, is_revoked"
      )
      .or(isUuid ? `id.eq.${id}` : `certificate_number.eq.${id}`)
      .maybeSingle();

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }

    // Access: owner, staff, or a still-valid public certificate
    let allowed = !certificate.is_revoked;
    if (!allowed && user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      allowed =
        certificate.user_id === user.id ||
        profile?.role === "admin" ||
        profile?.role === "instructor";
    }

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const completion = (certificate.completion_data ?? {}) as Record<
      string,
      number
    >;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const pdf = generateCertificatePdf({
      studentName: certificate.student_name,
      courseTitle: certificate.course_title,
      cohortName: certificate.cohort_name,
      certificateNumber: certificate.certificate_number,
      issuedAt: new Date(certificate.issued_at),
      completionPercent: Math.round(completion.lessons_percent ?? 0),
      verifyUrl: `${appUrl}/verify/${certificate.certificate_number}`,
    });

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="certificate-${certificate.certificate_number}.pdf"`,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (err) {
    console.error("Certificate PDF error:", err);
    return NextResponse.json(
      { error: "Could not generate PDF" },
      { status: 500 }
    );
  }
}
