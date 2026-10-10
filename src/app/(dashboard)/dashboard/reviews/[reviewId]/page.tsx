import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Link2,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatRelativeTime } from "@/lib/utils";
import { ReviewForm } from "./review-form";

type Props = { params: Promise<{ reviewId: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Peer Review" };
}

export default async function ReviewDetailPage({ params }: Props) {
  const { reviewId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch review assignment
  const { data: reviewAssignment } = await supabase
    .from("review_assignments")
    .select(
      `
      *,
      submission:submissions (
        id, content, file_url, file_name, link_url, submitted_at,
        assignment:assignments (id, title, description, rubric, is_anonymous_review)
      ),
      cohort:cohorts (id, name, course:courses (title, slug))
    `
    )
    .eq("id", reviewId)
    .eq("reviewer_id", user.id)
    .single();

  if (!reviewAssignment) notFound();

  const submission = reviewAssignment.submission;
  const assignment = submission?.assignment;
  const rubric = assignment?.rubric || [];
  const isCompleted =
    reviewAssignment.status === "completed" ||
    reviewAssignment.status === "late";

  // Fetch existing review if completed
  const { data: existingReview } = await supabase
    .from("reviews")
    .select("*")
    .eq("review_assignment_id", reviewId)
    .eq("reviewer_id", user.id)
    .single();

  return (
    <div className="space-y-6 animate-fade-up">
      <Link
        href="/dashboard/reviews"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Reviews
      </Link>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline">
            {reviewAssignment.cohort?.course?.title}
          </Badge>
          <Badge
            variant={isCompleted ? "default" : "accent"}
            className="capitalize gap-1"
          >
            {isCompleted ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <Clock className="h-3 w-3" />
            )}
            {reviewAssignment.status}
          </Badge>
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
          Review: {assignment?.title || "Assignment"}
        </h1>
        {reviewAssignment.due_at && (
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Due {formatRelativeTime(reviewAssignment.due_at)}
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Submission being reviewed */}
        <Card className="p-6">
          <h2 className="font-heading font-semibold mb-4">
            Student Submission
          </h2>
          {assignment?.is_anonymous_review && (
            <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Anonymous review — student identity is hidden
            </p>
          )}

          <div className="space-y-4">
            {submission?.content && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Text Response
                </p>
                <div className="rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">
                  {submission.content}
                </div>
              </div>
            )}
            {submission?.file_url && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <a
                  href={submission.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent-500 hover:underline"
                >
                  {submission.file_name || "View file"}
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
            {submission?.submitted_at && (
              <p className="text-xs text-muted-foreground">
                Submitted {formatRelativeTime(submission.submitted_at)}
              </p>
            )}
          </div>
        </Card>

        {/* Review form or existing review */}
        <div>
          {isCompleted && existingReview ? (
            <Card className="p-6">
              <h2 className="font-heading font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-accent-500" />
                Your Review
              </h2>
              <div className="space-y-4">
                {existingReview.rubric_scores?.map(
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
                      className="rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          {score.criterion_name}
                        </span>
                        <Badge variant="outline">
                          {score.score}/{score.max_score}
                        </Badge>
                      </div>
                      {score.comment && (
                        <p className="text-xs text-muted-foreground">
                          {score.comment}
                        </p>
                      )}
                    </div>
                  )
                )}
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-medium">Overall Score</span>
                  <span className="text-lg font-heading font-bold text-accent-500">
                    {existingReview.overall_score}
                  </span>
                </div>
                {existingReview.feedback && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Written Feedback
                    </p>
                    <div className="rounded-lg bg-muted p-4 text-sm">
                      {existingReview.feedback}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : submission ? (
            <ReviewForm
              reviewAssignmentId={reviewId}
              submissionId={submission.id}
              rubric={rubric}
            />
          ) : (
            <Card className="p-6 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                The submission for this review is no longer available.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
