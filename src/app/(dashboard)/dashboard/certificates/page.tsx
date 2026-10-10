import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Award,
  Download,
  Linkedin,
  ShieldCheck,
  GraduationCap,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/utils";
import {
  checkEligibility,
  getCompletionStats,
  DEFAULT_RULES,
  type CertificateRules,
} from "@/lib/certificates";

export const metadata: Metadata = { title: "My Certificates" };

export default async function CertificatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: certificates }, { data: enrollments }] = await Promise.all([
    supabase
      .from("certificates")
      .select(
        "id, certificate_number, student_name, course_title, cohort_name, issued_at, is_revoked, completion_data, linkedin_url"
      )
      .eq("user_id", user.id)
      .order("issued_at", { ascending: false }),
    supabase
      .from("enrollments")
      .select("id, cohort_id, status, cohort:cohorts (id, name, course_id, course:courses (id, title, certificate_rules))")
      .eq("user_id", user.id)
      .eq("status", "active"),
  ]);

  const inProgress = [] as {
    id: string;
    courseTitle: string;
    cohortName: string;
    stats: Awaited<ReturnType<typeof getCompletionStats>>;
    rules: CertificateRules;
  }[];

  for (const enrollment of enrollments ?? []) {
    const cohort = Array.isArray(enrollment.cohort)
      ? (enrollment.cohort as unknown as {
          name?: string;
          course?: unknown;
        }[])[0]
      : (enrollment.cohort as unknown as { name?: string; course?: unknown } | null);

    const course = Array.isArray(cohort?.course)
      ? (cohort?.course as unknown as {
          id?: string;
          title?: string;
          certificate_rules?: CertificateRules;
        }[])[0]
      : (cohort?.course as unknown as {
          id?: string;
          title?: string;
          certificate_rules?: CertificateRules;
        } | null);

    if (!course?.id) continue;

    try {
      const stats = await getCompletionStats(
        supabase,
        { id: enrollment.id, user_id: user.id, cohort_id: enrollment.cohort_id },
        course.id
      );
      inProgress.push({
        id: enrollment.id,
        courseTitle: course.title ?? "Course",
        cohortName: cohort?.name ?? "",
        stats,
        rules: { ...DEFAULT_RULES, ...(course.certificate_rules ?? {}) },
      });
    } catch {
      // progress metrics are best-effort; skip failures
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
          Certificates
        </h1>
        <p className="text-muted-foreground mt-1">
          Certificates of completion you have earned, plus progress toward the
          ones still in progress.
        </p>
      </div>

      {inProgress.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent-500" />
            In progress
          </h2>
          <div className="grid gap-4">
            {inProgress.map((row) => {
              const eligibility = checkEligibility(row.stats, row.rules);
              return (
                <Card key={row.id} className="p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="font-heading font-semibold">
                        {row.courseTitle}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {row.cohortName}
                      </p>
                    </div>
                    <Badge
                      variant={eligibility.eligible ? "accent" : "outline"}
                      className="gap-1.5"
                    >
                      <GraduationCap className="h-3 w-3" />
                      {eligibility.eligible
                        ? "Eligible — certificate pending"
                        : `${eligibility.missing.length} requirement(s) remaining`}
                    </Badge>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {(
                      [
                        ["Lessons", row.stats.lessons_percent, row.rules.lessons_complete_percent],
                        ["Live attendance", row.stats.attendance_percent, row.rules.live_attendance_percent],
                        ["Assignments", row.stats.assignments_percent, row.rules.assignments_submitted_percent],
                        ["Peer reviews", row.stats.reviews_percent, row.rules.peer_reviews_completed_percent],
                      ] as [string, number, number][]
                    ).map(([label, value, target]) => (
                      <div key={label} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {label} · target {target}%
                          </span>
                          <span
                            className={
                              value >= target
                                ? "text-accent-500 font-medium"
                                : "text-muted-foreground"
                            }
                          >
                            {value}%
                          </span>
                        </div>
                        <Progress value={value} />
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
          <Award className="h-4 w-4 text-accent-500" />
          Earned
        </h2>

        {(certificates ?? []).length === 0 ? (
          <Card className="p-12 text-center">
            <Award className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-heading font-semibold text-lg mb-1">
              No certificates yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Complete a cohort&rsquo;s lessons, live sessions, assignments, and
              peer reviews to earn a verified certificate.
            </p>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {(certificates ?? []).map((certificate) => (
              <Card key={certificate.id} className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-500/10 text-accent-500">
                    <Award className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-heading font-semibold">
                        {certificate.course_title}
                      </h3>
                      {certificate.is_revoked && (
                        <Badge variant="destructive" className="text-[10px]">
                          Revoked
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {certificate.cohort_name} · Issued{" "}
                      {formatDate(certificate.issued_at)}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                      {certificate.certificate_number}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!certificate.is_revoked && (
                      <>
                        <Button size="sm" asChild>
                          <a
                            href={`/api/certificates/generate?id=${certificate.certificate_number}`}
                          >
                            <Download className="h-4 w-4" />
                            PDF
                          </a>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <a
                            href={`/verify/${certificate.certificate_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            Verify
                          </a>
                        </Button>
                        <Button size="sm" variant="ghost" asChild>
                          <a
                            href={
                              certificate.linkedin_url ||
                              `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(certificate.course_title)}&organizationName=StarTech&certUrl=${encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL || ""}/verify/${certificate.certificate_number}`)}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Linkedin className="h-4 w-4" />
                            LinkedIn
                          </a>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
