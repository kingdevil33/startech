"use server";

import { createClient } from "@/lib/supabase/server";

// ─── Mark lesson complete/incomplete ────────────────────────────
export async function markLessonComplete({
  lessonId,
  enrollmentId,
  completed,
}: {
  lessonId: string;
  enrollmentId: string;
  completed: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("progress").upsert(
    {
      user_id: user.id,
      enrollment_id: enrollmentId,
      lesson_id: lessonId,
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
      last_accessed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,lesson_id,enrollment_id" }
  );

  if (error) return { error: error.message };
  return { success: true };
}

// ─── Update watch progress ────────────────────────────────────
export async function updateWatchProgress({
  lessonId,
  enrollmentId,
  watchSeconds,
  totalDurationSeconds,
  lastPositionSeconds,
}: {
  lessonId: string;
  enrollmentId: string;
  watchSeconds: number;
  totalDurationSeconds: number;
  lastPositionSeconds: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("progress").upsert(
    {
      user_id: user.id,
      enrollment_id: enrollmentId,
      lesson_id: lessonId,
      watch_seconds: watchSeconds,
      total_duration_seconds: totalDurationSeconds,
      last_position_seconds: lastPositionSeconds,
      last_accessed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,lesson_id,enrollment_id" }
  );

  if (error) return { error: error.message };
  return { success: true };
}
