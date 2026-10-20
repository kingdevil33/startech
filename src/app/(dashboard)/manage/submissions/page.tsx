import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ClipboardCheck, ChevronRight, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Submissions" };

export default async function SubmissionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["instructor", "admin", "teaching_assistant"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const isAdmin = profile.role === "admin";

  // Cohorts tied to my courses (all cohorts for admins)
  let courseQuery = supabase.from("courses").select("id");
  if (!isAdmin) courseQuery = courseQuery.eq("instructor_id", user.id);
  const { data: courses } = await courseQuery;
  const courseIds = courses?.map((c) => c.id) || [];

  const { data: cohorts } = courseIds.length > 0
    ? await supabase
        .from("cohorts")
        .select("id, name, course_id, course:courses (title)")
        .in("course_id", courseIds)
        .order("starts_at", { ascending: false })
    : { data: [] };

  const cohortIds = cohorts?.map((c) => c.id) || [];
  const cohortMap = new Map(
    (cohorts || []).map((c) => {
      const course = Array.isArray(c.course) ? c.course[0] : c.course;
      return [c.id, { name: c.name, courseTitle: course?.title || "" }];
    })
  );

  const { data: submissions } = cohortIds.length > 0
    ? await supabase
        .from("submissions")
        .select(
          `id, status, submitted_at, is_late, final_score, cohort_id,
           assignment:assignments (id, title, week_id),
           submitter:profiles!submissions_user_id_fkey (full_name, avatar_url, email)`
        )
        .in("cohort_id", cohortIds)
        .in("status", ["submitted", "late", "graded"])
        .order("submitted_at", { ascending: false })
        .limit(100)
    : { data: [] as SubmissionRow[] };

  type SubmissionRow = {
    id: string;
    status: string;
    submitted_at: string | null;
    is_late: boolean | null;
    final_score: number | null;
    cohort_id: string;
    assignment: { id: string; title: string; week_id: string }[] | null;
    submitter: { full_name: string | null; avatar_url: string | null; email: string | null }[] | null;
  };

  const rows: SubmissionRow[] = submissions || [];
  const pending = rows.filter((s) => s.status === "submitted" || s.status === "late");
  const graded = rows.filter((s) => s.status === "graded");

  function SubmissionRowItem({ s }: { s: SubmissionRow }) {
    const assignment = Array.isArray(s.assignment)
      ? s.assignment[0]
      : s.assignment;
    const submitter = Array.isArray(s.submitter) ? s.submitter[0] : s.submitter;
    const cohort = cohortMap.get(s.cohort_id);
    const initials =
      submitter?.full_name
        ?.split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "?";

    return (
      <div className="flex items-center justify-between gap-3 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-8 w-8">
            <AvatarImage src={submitter?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary-600 text-white text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">
              {submitter?.full_name || submitter?.email || "Unknown"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {assignment?.title || "Assignment"}
              {cohort && ` · ${cohort.name}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {s.status === "graded" && s.final_score !== null && (
            <span className="font-heading font-bold text-sm">
              {Number(s.final_score).toFixed(1)}
            </span>
          )}
          {s.is_late && (
            <Badge variant="destructive" className="text-[10px]">
              Late
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {s.submitted_at ? formatDate(s.submitted_at) : "—"}
          </span>
          {cohort && (
            <Button variant="ghost" size="sm" asChild className="gap-1">
              <Link href={`/manage/cohorts/${s.cohort_id}`}>
                Grade
                <ChevronRight className="h-3 w-3" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
          Submissions
        </h1>
        <p className="text-muted-foreground mt-1">
          Student work waiting for grading across your cohorts.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/10 p-2.5">
              <ClipboardCheck className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-heading font-bold">{pending.length}</p>
              <p className="text-xs text-muted-foreground">Awaiting grade</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-accent-500/10 p-2.5">
              <CheckCircle2 className="h-5 w-5 text-accent-500" />
            </div>
            <div>
              <p className="text-xl font-heading font-bold">{graded.length}</p>
              <p className="text-xs text-muted-foreground">Graded</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="font-heading text-lg font-semibold mb-2">Needs grading</h2>
        {pending.length > 0 ? (
          <div className="divide-y divide-border">
            {pending.map((s) => (
              <SubmissionRowItem key={s.id} s={s} />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-accent-500/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              All caught up — nothing needs grading.
            </p>
          </div>
        )}
      </Card>

      {graded.length > 0 && (
        <Card className="p-6">
          <h2 className="font-heading text-lg font-semibold mb-2">Recently graded</h2>
          <div className="divide-y divide-border">
            {graded.slice(0, 20).map((s) => (
              <SubmissionRowItem key={s.id} s={s} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
