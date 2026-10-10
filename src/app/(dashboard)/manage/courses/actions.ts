"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { success?: boolean; error?: string };
type Supabase = Awaited<ReturnType<typeof createClient>>;

const LESSON_TYPES = ["video", "text", "quiz", "resource"];
const LEVELS = ["beginner", "intermediate", "advanced"];

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

async function verifyCourseAccess(
  supabase: Supabase,
  courseId: string,
  userId: string,
  role: string
) {
  const { data: course } = await supabase
    .from("courses")
    .select("id, instructor_id")
    .eq("id", courseId)
    .maybeSingle();

  if (!course) return { error: "Course not found" as string };
  if (course.instructor_id !== userId && role !== "admin") {
    return { error: "You do not have access to this course" as string };
  }
  return { error: null as string | null, course };
}

type WeekRow = { id: string; course_id: string; week_number: number };
type WeekAccess = { error: string; week: null } | { error: null; week: WeekRow };

async function verifyWeekAccess(
  supabase: Supabase,
  weekId: string,
  userId: string,
  role: string
): Promise<WeekAccess> {
  const { data: week } = await supabase
    .from("weeks")
    .select("id, course_id, week_number")
    .eq("id", weekId)
    .maybeSingle();

  if (!week) return { error: "Week not found", week: null };

  const access = await verifyCourseAccess(
    supabase,
    week.course_id,
    userId,
    role
  );
  if (access.error) return { error: access.error, week: null };
  return { error: null, week };
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

function parsePercent(value: FormDataEntryValue | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function parseResources(
  value: FormDataEntryValue | null
): { title: string; url: string; type: string }[] {
  if (typeof value !== "string" || !value.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const items: { title: string; url: string; type: string }[] = [];
  for (const entry of parsed as unknown[]) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const url = typeof record.url === "string" ? record.url.trim() : "";
    const type = typeof record.type === "string" ? record.type.trim() : "";
    if (!title && !url) continue;
    items.push({ title, url, type: type || "file" });
  }
  return items;
}

function dbErrorMessage(message: string, code?: string): string {
  if (code === "23505") {
    return "That value is already taken. Please choose a different one.";
  }
  return message;
}

export async function updateCourseAction(
  formData: FormData
): Promise<ActionResult> {
  const courseId = formData.get("courseId") as string;
  if (!courseId) return { error: "Missing course id" };

  const auth = await requireContentEditor();
  if (auth.error || !auth.supabase) return { error: auth.error || "Forbidden" };
  const { supabase, userId, role } = auth;

  const access = await verifyCourseAccess(supabase, courseId, userId, role);
  if (access.error) return { error: access.error };

  const title = ((formData.get("title") as string) || "").trim();
  const slug = ((formData.get("slug") as string) || "").trim();
  if (!title) return { error: "Title is required" };
  if (!slug) return { error: "Slug is required" };

  const levelRaw = ((formData.get("level") as string) || "").trim();
  const durationRaw = Number(formData.get("estimated_duration_weeks"));

  const { error } = await supabase
    .from("courses")
    .update({
      title,
      slug,
      category: ((formData.get("category") as string) || "").trim() || null,
      level: LEVELS.includes(levelRaw) ? levelRaw : null,
      estimated_duration_weeks:
        Number.isFinite(durationRaw) && durationRaw >= 1
          ? Math.round(durationRaw)
          : 8,
      description: ((formData.get("description") as string) || "").trim(),
      long_description: ((formData.get("long_description") as string) || "")
        .trim(),
      thumbnail_url:
        ((formData.get("thumbnail_url") as string) || "").trim() || null,
      meta_title: ((formData.get("meta_title") as string) || "").trim() || null,
      meta_description:
        ((formData.get("meta_description") as string) || "").trim() || null,
      certificate_rules: {
        lessons_complete_percent: parsePercent(
          formData.get("lessons_complete_percent")
        ),
        live_attendance_percent: parsePercent(
          formData.get("live_attendance_percent")
        ),
        assignments_submitted_percent: parsePercent(
          formData.get("assignments_submitted_percent")
        ),
        peer_reviews_completed_percent: parsePercent(
          formData.get("peer_reviews_completed_percent")
        ),
      },
    })
    .eq("id", courseId);

  if (error) return { error: dbErrorMessage(error.message, error.code) };

  await logAudit(supabase, userId, "course.updated", "course", courseId, {
    title,
    slug,
  });

  revalidatePath(`/manage/courses/${courseId}`);
  return { success: true };
}

export async function createWeekAction(
  courseId: string,
  formData: FormData
): Promise<ActionResult> {
  if (!courseId) return { error: "Missing course id" };

  const auth = await requireContentEditor();
  if (auth.error || !auth.supabase) return { error: auth.error || "Forbidden" };
  const { supabase, userId, role } = auth;

  const access = await verifyCourseAccess(supabase, courseId, userId, role);
  if (access.error) return { error: access.error };

  const title = ((formData.get("title") as string) || "").trim();
  if (!title) return { error: "Title is required" };

  const weekNumberRaw = Number(formData.get("week_number"));
  if (!Number.isFinite(weekNumberRaw) || weekNumberRaw < 1) {
    return { error: "Week number must be at least 1" };
  }
  const week_number = Math.round(weekNumberRaw);

  const { data: existing } = await supabase
    .from("weeks")
    .select("id")
    .eq("course_id", courseId)
    .eq("week_number", week_number)
    .maybeSingle();

  if (existing) {
    return { error: "That week number already exists" };
  }

  const { data: created, error } = await supabase
    .from("weeks")
    .insert({
      course_id: courseId,
      title,
      description: ((formData.get("description") as string) || "").trim(),
      week_number,
    })
    .select("id")
    .single();

  if (error || !created) {
    if (error?.code === "23505") {
      return { error: "That week number already exists" };
    }
    return { error: error?.message || "Failed to create week" };
  }

  await logAudit(supabase, userId, "week.created", "week", created.id, {
    course_id: courseId,
    week_number,
    title,
  });

  revalidatePath(`/manage/courses/${courseId}`);
  redirect(`/manage/courses/${courseId}`);
}

export async function updateWeekAction(
  formData: FormData
): Promise<ActionResult> {
  const weekId = formData.get("weekId") as string;
  if (!weekId) return { error: "Missing week id" };

  const auth = await requireContentEditor();
  if (auth.error || !auth.supabase) return { error: auth.error || "Forbidden" };
  const { supabase, userId, role } = auth;

  const access = await verifyWeekAccess(supabase, weekId, userId, role);
  if (access.error || !access.week) {
    return { error: access.error || "Forbidden" };
  }

  const title = ((formData.get("title") as string) || "").trim();
  if (!title) return { error: "Title is required" };

  const { error } = await supabase
    .from("weeks")
    .update({
      title,
      description: ((formData.get("description") as string) || "").trim(),
    })
    .eq("id", weekId);

  if (error) return { error: dbErrorMessage(error.message, error.code) };

  await logAudit(supabase, userId, "week.updated", "week", weekId, { title });

  revalidatePath(`/manage/courses/${access.week.course_id}`);
  revalidatePath(`/manage/courses/${access.week.course_id}/weeks/${weekId}`);
  return { success: true };
}

export async function publishWeekAction(
  formData: FormData
): Promise<ActionResult> {
  const weekId = formData.get("weekId") as string;
  const isPublished = formData.get("isPublished") === "true";
  if (!weekId) return { error: "Missing week id" };

  const auth = await requireContentEditor();
  if (auth.error || !auth.supabase) return { error: auth.error || "Forbidden" };
  const { supabase, userId, role } = auth;

  const access = await verifyWeekAccess(supabase, weekId, userId, role);
  if (access.error || !access.week) {
    return { error: access.error || "Forbidden" };
  }

  const { error } = await supabase
    .from("weeks")
    .update({ is_published: !isPublished })
    .eq("id", weekId);

  if (error) return { error: error.message };

  await logAudit(supabase, userId, "week.publish_toggle", "week", weekId, {
    is_published: !isPublished,
  });

  revalidatePath(`/manage/courses/${access.week.course_id}`);
  revalidatePath(`/manage/courses/${access.week.course_id}/weeks/${weekId}`);
  return { success: true };
}

export async function createLessonAction(
  formData: FormData
): Promise<ActionResult> {
  const weekId = formData.get("weekId") as string;
  if (!weekId) return { error: "Missing week id" };

  const auth = await requireContentEditor();
  if (auth.error || !auth.supabase) return { error: auth.error || "Forbidden" };
  const { supabase, userId, role } = auth;

  const access = await verifyWeekAccess(supabase, weekId, userId, role);
  if (access.error || !access.week) {
    return { error: access.error || "Forbidden" };
  }

  const validation = validateLessonFields(formData);
  if (validation.error) return { error: validation.error };

  const { data: created, error } = await supabase
    .from("lessons")
    .insert({
      week_id: weekId,
      ...validation.fields,
    })
    .select("id")
    .single();

  if (error || !created) {
    return {
      error: dbErrorMessage(error?.message || "Failed to create lesson", error?.code),
    };
  }

  await logAudit(supabase, userId, "lesson.created", "lesson", created.id, {
    week_id: weekId,
    title: validation.fields.title,
  });

  revalidatePath(`/manage/courses/${access.week.course_id}`);
  revalidatePath(`/manage/courses/${access.week.course_id}/weeks/${weekId}`);
  redirect(
    `/manage/courses/${access.week.course_id}/weeks/${weekId}`
  );
}

export async function updateLessonAction(
  formData: FormData
): Promise<ActionResult> {
  const lessonId = formData.get("lessonId") as string;
  if (!lessonId) return { error: "Missing lesson id" };

  const auth = await requireContentEditor();
  if (auth.error || !auth.supabase) return { error: auth.error || "Forbidden" };
  const { supabase, userId, role } = auth;

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, week_id")
    .eq("id", lessonId)
    .maybeSingle();

  if (!lesson) return { error: "Lesson not found" };

  const access = await verifyWeekAccess(supabase, lesson.week_id, userId, role);
  if (access.error || !access.week) {
    return { error: access.error || "Forbidden" };
  }

  const validation = validateLessonFields(formData);
  if (validation.error) return { error: validation.error };

  const { error } = await supabase
    .from("lessons")
    .update(validation.fields)
    .eq("id", lessonId);

  if (error) return { error: dbErrorMessage(error.message, error.code) };

  await logAudit(supabase, userId, "lesson.updated", "lesson", lessonId, {
    week_id: lesson.week_id,
    title: validation.fields.title,
  });

  revalidatePath(`/manage/courses/${access.week.course_id}`);
  revalidatePath(`/manage/courses/${access.week.course_id}/weeks/${lesson.week_id}`);
  revalidatePath(
    `/manage/courses/${access.week.course_id}/weeks/${lesson.week_id}/lessons/${lessonId}`
  );
  return { success: true };
}

export async function deleteLessonAction(
  formData: FormData
): Promise<ActionResult> {
  const lessonId = formData.get("lessonId") as string;
  if (!lessonId) return { error: "Missing lesson id" };

  const auth = await requireContentEditor();
  if (auth.error || !auth.supabase) return { error: auth.error || "Forbidden" };
  const { supabase, userId, role } = auth;

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, week_id, title")
    .eq("id", lessonId)
    .maybeSingle();

  if (!lesson) return { error: "Lesson not found" };

  const access = await verifyWeekAccess(supabase, lesson.week_id, userId, role);
  if (access.error || !access.week) {
    return { error: access.error || "Forbidden" };
  }

  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) return { error: error.message };

  await logAudit(supabase, userId, "lesson.deleted", "lesson", lessonId, {
    week_id: lesson.week_id,
    title: lesson.title,
  });

  revalidatePath(`/manage/courses/${access.week.course_id}`);
  revalidatePath(`/manage/courses/${access.week.course_id}/weeks/${lesson.week_id}`);
  return { success: true };
}

function validateLessonFields(formData: FormData): {
  error?: string;
  fields: {
    title: string;
    slug: string;
    lesson_type: string;
    description: string;
    content: string;
    sort_order: number;
    duration_minutes: number | null;
    is_published: boolean;
    is_free_preview: boolean;
    resources: { title: string; url: string; type: string }[];
  };
} {
  const title = ((formData.get("title") as string) || "").trim();
  if (!title) return { error: "Title is required", fields: emptyLessonFields() };

  const slug = ((formData.get("slug") as string) || "").trim();
  if (!slug) return { error: "Slug is required", fields: emptyLessonFields() };

  const lessonTypeRaw = ((formData.get("lesson_type") as string) || "").trim();
  if (!LESSON_TYPES.includes(lessonTypeRaw)) {
    return { error: "Invalid lesson type", fields: emptyLessonFields() };
  }

  const sortOrderRaw = Number(formData.get("sort_order"));
  const durationRaw = Number(formData.get("duration_minutes"));

  return {
    fields: {
      title,
      slug,
      lesson_type: lessonTypeRaw,
      description: ((formData.get("description") as string) || "").trim(),
      content: ((formData.get("content") as string) || "").trim(),
      sort_order: Number.isFinite(sortOrderRaw) ? Math.round(sortOrderRaw) : 0,
      duration_minutes:
        formData.get("duration_minutes") !== null &&
        Number.isFinite(durationRaw) &&
        durationRaw >= 0
          ? Math.round(durationRaw)
          : null,
      is_published: formData.get("is_published") === "true",
      is_free_preview: formData.get("is_free_preview") === "true",
      resources: parseResources(formData.get("resources")),
    },
  };
}

function emptyLessonFields() {
  return {
    title: "",
    slug: "",
    lesson_type: "video",
    description: "",
    content: "",
    sort_order: 0,
    duration_minutes: null,
    is_published: false,
    is_free_preview: false,
    resources: [] as { title: string; url: string; type: string }[],
  };
}
