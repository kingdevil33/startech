"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitReview({
  reviewAssignmentId,
  submissionId,
  rubricScores,
  overallScore,
  feedback,
}: {
  reviewAssignmentId: string;
  submissionId: string;
  rubricScores: {
    criterion_name: string;
    score: number;
    max_score: number;
    comment: string;
  }[];
  overallScore: number;
  feedback: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // The assignment must be ours, still open, and match the submission shown
  const { data: assignment } = await supabase
    .from("review_assignments")
    .select("id, status, submission_id")
    .eq("id", reviewAssignmentId)
    .eq("reviewer_id", user.id)
    .single();

  if (!assignment) return { error: "Review assignment not found" };
  if (assignment.submission_id !== submissionId) {
    return { error: "Submission does not match this review" };
  }
  if (assignment.status !== "pending") {
    return { error: "This review has already been completed" };
  }

  // Create the review
  const { error: reviewError } = await supabase.from("reviews").insert({
    review_assignment_id: reviewAssignmentId,
    reviewer_id: user.id,
    submission_id: submissionId,
    rubric_scores: rubricScores,
    overall_score: overallScore,
    feedback: feedback || null,
  });

  if (reviewError) return { error: reviewError.message };

  // Update review assignment status
  const { error: updateError } = await supabase
    .from("review_assignments")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", reviewAssignmentId);

  if (updateError) return { error: updateError.message };

  // Roll this review into the submission's final score once enough exist
  const { error: gradeError } = await supabase.rpc(
    "grade_submission_from_reviews",
    { p_submission_id: submissionId }
  );
  if (gradeError) {
    console.error("grade_submission_from_reviews failed:", gradeError.message);
  }

  return { success: true };
}
