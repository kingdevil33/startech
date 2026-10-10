"use server";

import { createClient } from "@/lib/supabase/server";
import { notifyReviewersAssigned } from "@/lib/email/notify";

export async function submitAssignment({
  assignmentId,
  enrollmentId,
  cohortId,
  content,
  fileUrl,
  fileName,
  linkUrl,
  isLate,
}: {
  assignmentId: string;
  enrollmentId: string;
  cohortId: string;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  linkUrl?: string;
  isLate: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Upsert submission
  const { data, error } = await supabase
    .from("submissions")
    .upsert(
      {
        assignment_id: assignmentId,
        user_id: user.id,
        enrollment_id: enrollmentId,
        cohort_id: cohortId,
        content: content || null,
        file_url: fileUrl || null,
        file_name: fileName || null,
        link_url: linkUrl || null,
        status: isLate ? "late" : "submitted",
        submitted_at: new Date().toISOString(),
        is_late: isLate,
      },
      { onConflict: "assignment_id,user_id,cohort_id" }
    )
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Place peer reviewers on this submission (idempotent, security definer)
  const { error: assignError } = await supabase.rpc("assign_peer_reviews", {
    p_submission_id: data.id,
  });
  if (assignError) {
    console.error("assign_peer_reviews failed:", assignError.message);
  } else {
    const { data: assignment } = await supabase
      .from("assignments")
      .select("title")
      .eq("id", assignmentId)
      .maybeSingle();

    await notifyReviewersAssigned(supabase, data.id, {
      assignmentTitle: assignment?.title ?? "an assignment",
    });
  }

  return { success: true };
}
