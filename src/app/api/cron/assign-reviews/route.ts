import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CRON_UNAUTHORIZED, verifyCronSecret } from "@/lib/cron";
import { sendReviewAssignedEmail } from "@/lib/email/client";

const MAX_SUBMISSIONS_PER_RUN = 50;

/**
 * POST /api/cron/assign-reviews
 *
 * 1. Marks overdue pending review assignments as `late`.
 * 2. Assigns peer reviewers to submissions whose review window has opened.
 * 3. Notifies reviewers by email.
 */
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json(CRON_UNAUTHORIZED.json, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  // ---- 1. Overdue reviews ----
  const { data: overdue, error: overdueError } = await admin
    .from("review_assignments")
    .update({ status: "late" })
    .eq("status", "pending")
    .lt("due_at", nowIso)
    .select("id");
  if (overdueError) {
    return NextResponse.json({ error: overdueError.message }, { status: 500 });
  }

  // ---- 2. Assign reviewers for submissions past their review-open point ----
  const { data: submissions, error: subsError } = await admin
    .from("submissions")
    .select(
      `id, assignment_id, cohort_id,
       assignment:assignments!inner (
         id, review_due_offset_days, due_date_offset_days,
         week:weeks!inner (course_id, is_published)
       )`
    )
    .in("status", ["submitted", "late", "graded"])
    .limit(MAX_SUBMISSIONS_PER_RUN * 3);

  if (subsError) {
    return NextResponse.json({ error: subsError.message }, { status: 500 });
  }

  let assigned = 0;
  const notified: string[] = [];
  const errors: string[] = [];

  for (const submission of submissions ?? []) {
    if (assigned >= MAX_SUBMISSIONS_PER_RUN) break;

    const assignment = Array.isArray(submission.assignment)
      ? (submission.assignment as unknown as {
          id: string;
          review_due_offset_days: number;
          due_date_offset_days: number;
          week?: { is_published?: boolean } | { is_published?: boolean }[];
        }[])[0]
      : (submission.assignment as unknown as {
          id: string;
          review_due_offset_days: number;
          due_date_offset_days: number;
          week?: { is_published?: boolean } | { is_published?: boolean }[];
        } | null);

    if (!assignment) continue;

    const week = Array.isArray(assignment.week)
      ? (assignment.week as unknown as { is_published?: boolean }[])[0]
      : (assignment.week as unknown as { is_published?: boolean } | null);

    if (week && week.is_published === false) continue;

    // Review window opens after the submission due date
    const { data: dueDate } = await admin.rpc("get_assignment_due_date", {
      p_assignment_id: assignment.id,
      p_cohort_id: submission.cohort_id,
    });

    if (!dueDate) continue;
    const reviewOpens = new Date(dueDate);
    reviewOpens.setDate(
      reviewOpens.getDate() +
        (assignment.review_due_offset_days - assignment.due_date_offset_days)
    );

    if (reviewOpens.getTime() > now) continue;

    // Skip submissions that already have reviewers
    const { data: existing } = await admin
      .from("review_assignments")
      .select("id")
      .eq("submission_id", submission.id)
      .limit(1);

    if ((existing ?? []).length > 0) continue;

    const { data: created, error: assignError } = await admin.rpc(
      "assign_peer_reviews",
      { p_submission_id: submission.id }
    );

    if (assignError) {
      errors.push(`${submission.id}: ${assignError.message}`);
      continue;
    }
    assigned += Number(created ?? 0);

    // Notify whoever just got assigned (created in the last 10 minutes)
    const { data: fresh } = await admin
      .from("review_assignments")
      .select(
        "id, reviewer_id, due_at, profile:profiles (email), assignment:assignments (title)"
      )
      .eq("submission_id", submission.id)
      .gte("created_at", new Date(now - 10 * 60_000).toISOString());

    for (const ra of fresh ?? []) {
      const profile = Array.isArray(ra.profile)
        ? (ra.profile as unknown as { email?: string }[])[0]
        : (ra.profile as unknown as { email?: string } | null);
      const raAssignment = Array.isArray(ra.assignment)
        ? (ra.assignment as unknown as { title?: string }[])[0]
        : (ra.assignment as unknown as { title?: string } | null);

      if (!profile?.email) continue;

      await admin.rpc("create_notification", {
        p_user_id: ra.reviewer_id,
        p_type: "review_assigned",
        p_title: "Peer review assigned",
        p_body: `Please review a classmate's submission for ${raAssignment?.title ?? "an assignment"}.`,
        p_link: "/dashboard/reviews",
      });

      await sendReviewAssignedEmail(profile.email, {
        assignmentTitle: raAssignment?.title ?? "Assignment",
        dueAt: ra.due_at ? new Date(ra.due_at).toDateString() : null,
        reviewCount: 1,
      });

      notified.push(ra.id);
    }
  }

  return NextResponse.json({
    overdueMarked: overdue?.length ?? 0,
    submissionsAssigned: assigned,
    reviewersNotified: notified.length,
    errors,
  });
}
