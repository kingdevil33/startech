"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { success?: boolean; error?: string };
type Supabase = Awaited<ReturnType<typeof createClient>>;

const PLATFORMS = ["zoom", "youtube", "tiktok", "custom"];
const ENROLLMENT_STATUSES = [
  "active",
  "dropped",
  "completed",
  "refunded",
  "expired",
];
const COHORT_TRANSITIONS: Record<string, string[]> = {
  draft: ["enrollment_open"],
  enrollment_open: ["enrollment_closed"],
  enrollment_closed: ["active"],
  active: ["completed"],
  completed: ["archived"],
};

async function requireContentEditor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !["instructor", "admin", "teaching_assistant"].includes(profile.role)
  ) {
    return { error: "Forbidden" as const };
  }

  return {
    error: null as string | null,
    supabase,
    userId: user.id,
    role: profile.role as string,
  };
}

type CohortRow = {
  id: string;
  course_id: string;
  status: string;
  seats_filled: number;
  capacity: number;
};
type CohortAccess =
  | { error: string; cohort: null }
  | { error: null; cohort: CohortRow };

async function verifyCohortAccess(
  supabase: Supabase,
  cohortId: string,
  userId: string,
  role: string
): Promise<CohortAccess> {
  const { data: cohort } = await supabase
    .from("cohorts")
    .select("id, course_id, status, seats_filled, capacity")
    .eq("id", cohortId)
    .maybeSingle();

  if (!cohort) return { error: "Cohort not found", cohort: null };

  const { data: course } = await supabase
    .from("courses")
    .select("id, instructor_id")
    .eq("id", cohort.course_id)
    .maybeSingle();

  if (!course) return { error: "Cohort course not found", cohort: null };
  if (course.instructor_id !== userId && role !== "admin") {
    return { error: "You do not have access to this cohort", cohort: null };
  }

  return { error: null, cohort };
}

async function logAudit(
  supabase: Supabase,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, unknown>
) {
  await supabase.rpc("log_audit", {
    p_actor_id: actorId,
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_details: details,
  });
}

export async function createSessionAction(
  formData: FormData
): Promise<ActionResult> {
  const cohortId = formData.get("cohortId") as string;
  if (!cohortId) return { error: "Missing cohort id" };

  const auth = await requireContentEditor();
  if (auth.error || !auth.supabase) return { error: auth.error || "Forbidden" };
  const { supabase, userId, role } = auth;

  const access = await verifyCohortAccess(supabase, cohortId, userId, role);
  if (access.error || !access.cohort) {
    return { error: access.error || "Forbidden" };
  }

  const title = ((formData.get("title") as string) || "").trim();
  if (!title) return { error: "Title is required" };

  const platformRaw = ((formData.get("platform") as string) || "").trim();
  if (!PLATFORMS.includes(platformRaw)) {
    return { error: "Invalid platform" };
  }

  const scheduledRaw = ((formData.get("scheduled_at") as string) || "").trim();
  if (!scheduledRaw) return { error: "Scheduled time is required" };
  const scheduledAt = new Date(scheduledRaw);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { error: "Invalid scheduled time" };
  }

  const joinUrl = ((formData.get("join_url") as string) || "").trim();
  if (platformRaw !== "zoom" && !joinUrl) {
    return { error: "A join URL is required for this platform" };
  }

  const durationRaw = Number(formData.get("duration_minutes"));
  const duration_minutes =
    Number.isFinite(durationRaw) && durationRaw >= 5
      ? Math.round(durationRaw)
      : 60;

  const weekId = ((formData.get("week_id") as string) || "").trim();
  if (weekId) {
    const { data: week } = await supabase
      .from("weeks")
      .select("id")
      .eq("id", weekId)
      .eq("course_id", access.cohort.course_id)
      .maybeSingle();
    if (!week) return { error: "Selected week does not belong to this course" };
  }

  const { data: created, error } = await supabase
    .from("live_sessions")
    .insert({
      cohort_id: cohortId,
      week_id: weekId || null,
      title,
      description: ((formData.get("description") as string) || "").trim(),
      platform: platformRaw,
      status: "scheduled",
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes,
      join_url: joinUrl || null,
      host_id: userId,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { error: error?.message || "Failed to create session" };
  }

  await logAudit(
    supabase,
    userId,
    "session.created",
    "live_session",
    created.id,
    { cohort_id: cohortId, title, platform: platformRaw }
  );

  revalidatePath(`/manage/cohorts/${cohortId}`);
  return { success: true };
}

export async function updateEnrollmentStatusAction(
  formData: FormData
): Promise<ActionResult> {
  const enrollmentId = formData.get("enrollmentId") as string;
  const status = ((formData.get("status") as string) || "").trim();
  if (!enrollmentId) return { error: "Missing enrollment id" };
  if (!ENROLLMENT_STATUSES.includes(status)) {
    return { error: "Invalid enrollment status" };
  }

  const auth = await requireContentEditor();
  if (auth.error || !auth.supabase) return { error: auth.error || "Forbidden" };
  const { supabase, userId, role } = auth;

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, status, cohort_id, user_id")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (!enrollment) return { error: "Enrollment not found" };

  const access = await verifyCohortAccess(
    supabase,
    enrollment.cohort_id,
    userId,
    role
  );
  if (access.error || !access.cohort) {
    return { error: access.error || "Forbidden" };
  }

  const { error } = await supabase
    .from("enrollments")
    .update({ status })
    .eq("id", enrollmentId);

  if (error) return { error: error.message };

  await logAudit(
    supabase,
    userId,
    "enrollment.status_changed",
    "enrollment",
    enrollmentId,
    { from: enrollment.status, to: status, user_id: enrollment.user_id }
  );

  revalidatePath(`/manage/cohorts/${enrollment.cohort_id}`);
  return { success: true };
}

export async function removeEnrollmentAction(
  formData: FormData
): Promise<ActionResult> {
  const enrollmentId = formData.get("enrollmentId") as string;
  if (!enrollmentId) return { error: "Missing enrollment id" };

  const auth = await requireContentEditor();
  if (auth.error || !auth.supabase) return { error: auth.error || "Forbidden" };
  const { supabase, userId, role } = auth;

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, status, cohort_id, user_id")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (!enrollment) return { error: "Enrollment not found" };

  const access = await verifyCohortAccess(
    supabase,
    enrollment.cohort_id,
    userId,
    role
  );
  if (access.error || !access.cohort) {
    return { error: access.error || "Forbidden" };
  }

  const { error: updateError } = await supabase
    .from("enrollments")
    .update({ status: "dropped" })
    .eq("id", enrollmentId);

  if (updateError) return { error: updateError.message };

  let seatsFilled = Number(access.cohort.seats_filled) || 0;
  if (enrollment.status === "active") {
    seatsFilled = Math.max(0, seatsFilled - 1);
    const { error: seatError } = await supabase
      .from("cohorts")
      .update({ seats_filled: seatsFilled })
      .eq("id", enrollment.cohort_id);
    if (seatError) return { error: seatError.message };
  }

  await logAudit(
    supabase,
    userId,
    "enrollment.removed",
    "enrollment",
    enrollmentId,
    {
      cohort_id: enrollment.cohort_id,
      previous_status: enrollment.status,
      seats_filled: seatsFilled,
    }
  );

  revalidatePath(`/manage/cohorts/${enrollment.cohort_id}`);
  return { success: true };
}

export async function gradeSubmissionAction(
  formData: FormData
): Promise<ActionResult> {
  const submissionId = formData.get("submissionId") as string;
  if (!submissionId) return { error: "Missing submission id" };

  const scoreRaw = Number(formData.get("score"));
  if (!Number.isFinite(scoreRaw) || scoreRaw < 0) {
    return { error: "A valid score is required" };
  }

  const feedback = ((formData.get("feedback") as string) || "").trim();
  const score = Math.round(scoreRaw * 100) / 100;

  const auth = await requireContentEditor();
  if (auth.error || !auth.supabase) return { error: auth.error || "Forbidden" };
  const { supabase, userId, role } = auth;

  const { data: submission } = await supabase
    .from("submissions")
    .select("id, cohort_id, user_id, assignment_id")
    .eq("id", submissionId)
    .maybeSingle();

  if (!submission) return { error: "Submission not found" };

  const access = await verifyCohortAccess(
    supabase,
    submission.cohort_id,
    userId,
    role
  );
  if (access.error || !access.cohort) {
    return { error: access.error || "Forbidden" };
  }

  const { error } = await supabase
    .from("submissions")
    .update({
      instructor_override: true,
      instructor_score: score,
      instructor_feedback: feedback,
      final_score: score,
      status: "graded",
    })
    .eq("id", submissionId);

  if (error) return { error: error.message };

  await logAudit(
    supabase,
    userId,
    "submission.graded",
    "submission",
    submissionId,
    {
      cohort_id: submission.cohort_id,
      score,
      user_id: submission.user_id,
    }
  );

  revalidatePath(`/manage/cohorts/${submission.cohort_id}`);
  return { success: true };
}

export async function updateCohortStatusAction(
  formData: FormData
): Promise<ActionResult> {
  const cohortId = formData.get("cohortId") as string;
  const status = ((formData.get("status") as string) || "").trim();
  if (!cohortId) return { error: "Missing cohort id" };
  if (!status) return { error: "Missing status" };

  const auth = await requireContentEditor();
  if (auth.error || !auth.supabase) return { error: auth.error || "Forbidden" };
  const { supabase, userId, role } = auth;

  const access = await verifyCohortAccess(supabase, cohortId, userId, role);
  if (access.error || !access.cohort) {
    return { error: access.error || "Forbidden" };
  }

  const allowedNext = COHORT_TRANSITIONS[access.cohort.status] || [];
  if (!allowedNext.includes(status)) {
    return {
      error: `Cannot move cohort from ${access.cohort.status} to ${status}`,
    };
  }

  const { error } = await supabase
    .from("cohorts")
    .update({ status })
    .eq("id", cohortId);

  if (error) return { error: error.message };

  await logAudit(supabase, userId, "cohort.status_changed", "cohort", cohortId, {
    from: access.cohort.status,
    to: status,
  });

  revalidatePath(`/manage/cohorts/${cohortId}`);
  return { success: true };
}
