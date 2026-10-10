import Link from "next/link";
import type { Metadata } from "next";
import { Star, Award, Calendar, ShieldCheck, ShieldX, Download, Linkedin, ArrowLeft, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

type Props = { params: Promise<{ certificateId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { certificateId } = await params;
  return {
    title: `Verify ${certificateId} | StarTech`,
    description: "Verify a StarTech certificate of completion.",
  };
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <div className="h-8 w-8 rounded-lg bg-accent-500 flex items-center justify-center">
        <Star className="h-5 w-5 text-white" />
      </div>
      <span className="font-heading text-xl font-bold">StarTech</span>
    </Link>
  );
}

export default async function VerifyCertificatePage({ params }: Props) {
  const { certificateId } = await params;
  const supabase = await createClient();

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      certificateId
    );

  const { data: certificate } = await supabase
    .from("certificates")
    .select(
      "id, certificate_number, student_name, course_title, cohort_name, completion_data, issued_at, is_revoked, revoke_reason, linkedin_url"
    )
    .or(isUuid ? `id.eq.${certificateId}` : `certificate_number.eq.${certificateId}`)
    .maybeSingle();

  // Revoked certificates are hidden from anonymous visitors by RLS
  const notFound = !certificate;
  const revoked = certificate?.is_revoked === true;
  const completion = (certificate?.completion_data ?? {}) as Record<string, number>;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-4 sm:px-6 h-16">
          <Logo />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back to StarTech
            </Link>
          </Button>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
        <div className="text-center space-y-2 mb-8">
          <Badge variant="outline" className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-accent-500" />
            Certificate Verification
          </Badge>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            {notFound ? "Certificate Not Found" : revoked ? "Certificate Revoked" : "Certificate Verified"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {notFound
              ? "No certificate matches this reference. Check the certificate number and try again."
              : revoked
                ? "This certificate has been revoked and is no longer valid."
                : "This certificate is authentic and was issued by StarTech."}
          </p>
        </div>

        {certificate && (
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Certificate of Completion
                </p>
                <p className="font-heading text-2xl font-bold">
                  {certificate.student_name}
                </p>
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  revoked
                    ? "bg-destructive/10 text-destructive"
                    : "bg-accent-500/10 text-accent-500"
                }`}
              >
                {revoked ? (
                  <ShieldX className="h-6 w-6" />
                ) : (
                  <Award className="h-6 w-6" />
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs uppercase tracking-wider">Course</p>
                <p className="font-medium">{certificate.course_title}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs uppercase tracking-wider">Cohort</p>
                <p className="font-medium">{certificate.cohort_name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs uppercase tracking-wider">Issued</p>
                <p className="font-medium flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatDate(certificate.issued_at)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs uppercase tracking-wider">Reference</p>
                <p className="font-mono text-xs sm:text-sm">{certificate.certificate_number}</p>
              </div>
            </div>

            {completion.lessons_percent !== undefined && (
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["Lessons", completion.lessons_percent],
                    ["Attendance", completion.attendance_percent],
                    ["Assignments", completion.assignments_percent],
                    ["Reviews", completion.reviews_percent],
                  ] as [string, number | undefined][]
                )
                  .filter(([, v]) => typeof v === "number")
                  .map(([label, value]) => (
                    <Badge key={label} variant="secondary" className="gap-1.5">
                      <GraduationCap className="h-3 w-3" />
                      {label}: {value}%
                    </Badge>
                  ))}
              </div>
            )}

            {revoked && certificate.revoke_reason && (
              <p className="text-sm text-destructive border border-destructive/30 rounded-lg bg-destructive/5 p-3">
                Revocation reason: {certificate.revoke_reason}
              </p>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              {!revoked && (
                <>
                  <Button asChild>
                    <a
                      href={`/api/certificates/generate?id=${certificate.certificate_number}`}
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </a>
                  </Button>
                  {(certificate.linkedin_url || (
                    process.env.NEXT_PUBLIC_APP_URL
                  )) && (
                    <Button variant="outline" asChild>
                      <a
                        href={
                          certificate.linkedin_url ||
                          `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(certificate.course_title)}&organizationName=StarTech&certUrl=${encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL || ""}/verify/${certificate.certificate_number}`)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Linkedin className="h-4 w-4" />
                        Add to LinkedIn
                      </a>
                    </Button>
                  )}
                </>
              )}
            </div>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">
          StarTech certificates are issued only for learners who complete a
          cohort&rsquo;s requirements. Contact support if you believe this result
          is incorrect.
        </p>
      </main>
    </div>
  );
}
