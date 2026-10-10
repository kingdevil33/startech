import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Clock,
  ClipboardCheck,
  Upload,
  FileText,
  Link2,
  Type,
  AlertCircle,
  CheckCircle2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { SubmissionForm } from "./submission-form";

type Props = {
  params: Promise<{ courseSlug: string; assignmentId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { assignmentId } = await params;
  const supabase = await createClient();
  const { data: assignment } = await supabase
    .from("assignments")
    .select("title")
    .eq("id", assignmentId)
    .single();

  return { title: assignment?.title || "Assignment" };
}

export default async function AssignmentPage({ params }: Props) {
  const { courseSlug, assignmentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch course
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, slug")
    .eq("slug", courseSlug)
    .single();

  if (!course) notFound();

  // Fetch assignment with week info
  const { data: assignment } = await supabase
    .from("assignments")
    .select("*, week:weeks (id, title, week_number, course_id)")
    .eq("id", assignmentId)
    .single();

  if (!assignment || !assignment.week) notFound();

  // Fetch enrollment
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("*, cohort:cohorts (*)")
    .eq("user_id", user.id)
    .in("status", ["active", "completed"])
    .eq("cohort.course_id", course.id)
    .not("cohort", "is", null)
    .limit(1)
    .single();

  if (!enrollment) redirect(`/courses/${courseSlug}`);

  // Calculate due date
  const cohortStart = new Date(enrollment.cohort.starts_at);
  const weekUnlockDate = new Date(cohortStart);
  weekUnlockDate.setDate(
    weekUnlockDate.getDate() + (assignment.week.week_number - 1) * 7
  );
  const dueDate = new Date(weekUnlockDate);
  dueDate.setDate(dueDate.getDate() + assignment.due_date_offset_days);
  const isOverdue = new Date() > dueDate;

  // Calculate review due date
  const reviewDueDate = new Date(weekUnlockDate);
  reviewDueDate.setDate(
    reviewDueDate.getDate() + assignment.review_due_offset_days
  );

  // Fetch existing submission
  const { data: submission } = await supabase
    .from("submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .eq("user_id", user.id)
    .eq("cohort_id", enrollment.cohort.id)
    .single();

  const isSubmitted =
    submission?.status === "submitted" || submission?.status === "graded";

  // Fetch reviews received (if graded)
  const { data: reviewsReceived } = submission
    ? await supabase
        .from("reviews")
        .select("*, reviewer:profiles!reviews_reviewer_id_fkey (full_name)")
        .eq("submission_id", submission.id)
    : { data: null };

  const rubric = assignment.rubric || [];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/dashboard"
          className="hover:text-foreground transition-colors"
        >
          Dashboard
        </Link>
        <span>/</span>
        <Link
          href={`/dashboard/courses/${courseSlug}`}
          className="hover:text-foreground transition-colors"
        >
          {course.title}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate">
          {assignment.title}
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content — 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">
                Week {assignment.week.week_number}
              </Badge>
              <Badge variant={assignment.is_required ? "accent" : "outline"}>
                {assignment.is_required ? "Required" : "Optional"}
              </Badge>
              {isSubmitted && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {submission?.status === "graded" ? "Graded" : "Submitted"}
                </Badge>
              )}
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
              {assignment.title}
            </h1>
          </div>

          {/* Description */}
          {assignment.description && (
            <Card className="p-6">
              <h2 className="font-heading font-semibold mb-3">Instructions</h2>
              <div
                className="prose prose-sm dark:prose-invert max-w-none
                  prose-headings:font-heading prose-a:text-accent-500"
                dangerouslySetInnerHTML={{ __html: assignment.description }}
              />
            </Card>
          )}

          {/* Rubric */}
          {rubric.length > 0 && (
            <Card className="p-6">
              <h2 className="font-heading font-semibold mb-4 flex items-center gap-2">
                <Star className="h-4 w-4 text-electric-500" />
                Grading Rubric
              </h2>
              <div className="space-y-3">
                {rubric.map(
                  (
                    criterion: {
                      name: string;
                      description: string;
                      max_score: number;
                      weight: number;
                    },
                    i: number
                  ) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border p-4"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-sm">
                          {criterion.name}
                        </h3>
                        <Badge variant="outline" className="text-[10px]">
                          {criterion.max_score} pts (×{criterion.weight})
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {criterion.description}
                      </p>
                    </div>
                  )
                )}
              </div>
            </Card>
          )}

          {/* Submission form or status */}
          {isSubmitted ? (
            <Card className="p-6">
              <h2 className="font-heading font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-accent-500" />
                Your Submission
              </h2>
              <div className="space-y-4">
                {submission?.content && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Text submission:
                    </p>
                    <div className="rounded-lg bg-muted p-4 text-sm">
                      {submission.content}
                    </div>
                  </div>
                )}
                {submission?.file_url && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={submission.file_url}
                      className="text-sm text-accent-500 hover:underline"
                    >
                      {submission.file_name || "Download file"}
                    </a>
                  </div>
                )}
                {submission?.link_url && (
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={submission.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-accent-500 hover:underline"
                    >
                      {submission.link_url}
                    </a>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Submitted{" "}
                  {submission?.submitted_at
                    ? formatRelativeTime(submission.submitted_at)
                    : ""}
                  {submission?.is_late && (
                    <Badge variant="destructive" className="ml-2 text-[10px]">
                      Late
                    </Badge>
                  )}
                </div>

                {/* Score */}
                {submission?.status === "graded" &&
                  submission?.final_score !== null && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium mb-2">
                          Final Score:{" "}
                          <span className="text-accent-500 text-lg font-heading font-bold">
                            {submission.final_score}
                          </span>
                        </p>
                        {submission.instructor_feedback && (
                          <div className="rounded-lg bg-muted p-4 text-sm">
                            <p className="text-xs text-muted-foreground mb-1">
                              Instructor feedback:
                            </p>
                            {submission.instructor_feedback}
                          </div>
                        )}
                      </div>
                    </>
                  )}
              </div>
            </Card>
          ) : (
            <SubmissionForm
              assignmentId={assignmentId}
              enrollmentId={enrollment.id}
              cohortId={enrollment.cohort.id}
              submissionTypes={assignment.submission_types}
              existingSubmission={submission}
              isOverdue={isOverdue}
            />
          )}

          {/* Peer Reviews Received */}
          {reviewsReceived && reviewsReceived.length > 0 && (
            <Card className="p-6">
              <h2 className="font-heading font-semibold mb-4">
                Peer Reviews Received
              </h2>
              <div className="space-y-4">
                {reviewsReceived.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-lg border border-border p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {assignment.is_anonymous_review
                          ? "Anonymous Reviewer"
                          : review.reviewer?.full_name || "Reviewer"}
                      </p>
                      {review.overall_score !== null && (
                        <Badge variant="accent">
                          Score: {review.overall_score}
                        </Badge>
                      )}
                    </div>
                    {review.feedback && (
                      <p className="text-sm text-muted-foreground">
                        {review.feedback}
                      </p>
                    )}
                    {review.rubric_scores?.length > 0 && (
                      <div className="space-y-1">
                        {review.rubric_scores.map(
                          (
                            score: {
                              criterion_name: string;
                              score: number;
                              max_score: number;
                              comment?: string;
                            },
                            i: number
                          ) => (
                            <div
                              key={i}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="text-muted-foreground">
                                {score.criterion_name}
                              </span>
                              <span className="font-medium">
                                {score.score}/{score.max_score}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar — 1 col */}
        <div className="space-y-4">
          {/* Due date card */}
          <Card className="p-5">
            <h3 className="font-heading font-semibold text-sm mb-3">
              Deadlines
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-lg p-2 ${
                    isOverdue && !isSubmitted
                      ? "bg-destructive/10"
                      : "bg-electric-500/10"
                  }`}
                >
                  <ClipboardCheck
                    className={`h-4 w-4 ${
                      isOverdue && !isSubmitted
                        ? "text-destructive"
                        : "text-electric-500"
                    }`}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">Submission Due</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(dueDate.toISOString(), {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                  {isOverdue && !isSubmitted && (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                      <AlertCircle className="h-3 w-3" />
                      Overdue
                    </p>
                  )}
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2 bg-blue-500/10">
                  <Clock className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Peer Review Due</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(reviewDueDate.toISOString(), {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Submission types */}
          <Card className="p-5">
            <h3 className="font-heading font-semibold text-sm mb-3">
              Accepted Formats
            </h3>
            <div className="space-y-2">
              {assignment.submission_types.map((type: string) => (
                <div key={type} className="flex items-center gap-2 text-sm">
                  {type === "text" && (
                    <Type className="h-4 w-4 text-muted-foreground" />
                  )}
                  {type === "file" && (
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  )}
                  {type === "link" && (
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="capitalize">{type}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Peer review info */}
          <Card className="p-5">
            <h3 className="font-heading font-semibold text-sm mb-3">
              Peer Review
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                You will review{" "}
                <span className="font-medium text-foreground">
                  {assignment.reviews_per_student}
                </span>{" "}
                peer submissions.
              </p>
              <p>
                Reviews are{" "}
                <span className="font-medium text-foreground">
                  {assignment.is_anonymous_review ? "anonymous" : "named"}
                </span>
                .
              </p>
            </div>
          </Card>

          {/* Back link */}
          <Button variant="outline" className="w-full gap-2" asChild>
            <Link href={`/dashboard/courses/${courseSlug}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to Syllabus
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
