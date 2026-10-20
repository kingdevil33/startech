"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { success?: boolean; error?: string };
type Supabase = Awaited<ReturnType<typeof createClient>>;

const COHORT_STATUSES = [
  "draft",
  "enrollment_open",
  "enrollment_closed",
  "active",
  "completed",
  "archived",
];

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

async function verifyCourseOwnership(
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
  return { error: null as string | null };
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

type CouponEntry = {
  code: string;
  discount_percent: number;
  max_uses: number | null;
};

function parseCoupons(value: FormDataEntryValue | null): CouponEntry[] | string {
  if (typeof value !== "string" || !value.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return "Invalid coupon data";
  }
  if (!Array.isArray(parsed)) return "Invalid coupon data";

  const items: CouponEntry[] = [];
  const seen = new Set<string>();
  for (const entry of parsed as unknown[]) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const code =
      typeof record.code === "string" ? record.code.trim().toUpperCase() : "";
    if (!code) continue;
    if (seen.has(code)) return `Duplicate coupon code: ${code}`;
    seen.add(code);

    const discount = Number(record.discount_percent);
    if (!Number.isFinite(discount) || discount <= 0 || discount > 100) {
      return `Discount for "${code}" must be between 1 and 100`;
    }

    const maxUsesRaw = record.max_uses;
    let max_uses: number | null = null;
    if (maxUsesRaw !== null && maxUsesRaw !== undefined && maxUsesRaw !== "") {
      const parsedMax = Number(maxUsesRaw);
      if (!Number.isFinite(parsedMax) || parsedMax < 1) {
        return `Max uses for "${code}" must be at least 1`;
      }
      max_uses = Math.round(parsedMax);
    }

    items.push({
      code,
      discount_percent: Math.round(discount),
      max_uses,
    });
  }
  return items;
}

type CohortFields = {
  course_id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  capacity: number;
  enrollment_opens_at: string | null;
  enrollment_closes_at: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  post_access_days: number;
  coupon_codes: CouponEntry[];
};

function parseDate(value: FormDataEntryValue | null): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function parseCohortFields(formData: FormData): {
  error?: string;
  fields?: CohortFields;
} {
  const course_id = ((formData.get("course_id") as string) || "").trim();
  if (!course_id) return { error: "Course is required" };

  const name = ((formData.get("name") as string) || "").trim();
  if (!name) return { error: "Cohort name is required" };

  const slug = ((formData.get("slug") as string) || "").trim();
  if (!slug) return { error: "Slug is required" };

  const priceRaw = Number(formData.get("price"));
  if (!Number.isFinite(priceRaw) || priceRaw < 0) {
    return { error: "Price must be zero or greater" };
  }

  const currency = ((formData.get("currency") as string) || "GHS")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { error: "Currency must be a 3-letter code" };
  }

  const capacityRaw = Number(formData.get("capacity"));
  if (!Number.isFinite(capacityRaw) || capacityRaw < 1) {
    return { error: "Capacity must be at least 1" };
  }

  const starts_at = parseDate(formData.get("starts_at"));
  if (!starts_at) return { error: "Start date is required" };
  const ends_at = parseDate(formData.get("ends_at"));
  if (!ends_at) return { error: "End date is required" };
  if (new Date(ends_at) <= new Date(starts_at)) {
    return { error: "End date must be after start date" };
  }

  const enrollment_opens_at = parseDate(formData.get("enrollment_opens_at"));
  const enrollment_closes_at = parseDate(formData.get("enrollment_closes_at"));
  if (
    enrollment_opens_at &&
    enrollment_closes_at &&
    new Date(enrollment_closes_at) <= new Date(enrollment_opens_at)
  ) {
    return { error: "Enrollment close must be after enrollment open" };
  }

  const postAccessRaw = Number(formData.get("post_access_days"));
  const post_access_days =
    Number.isFinite(postAccessRaw) && postAccessRaw >= 0
      ? Math.round(postAccessRaw)
      : 90;

  const coupons = parseCoupons(formData.get("coupon_codes"));
  if (typeof coupons === "string") return { error: coupons };

  const timezone =
    ((formData.get("timezone") as string) || "Africa/Accra").trim() ||
    "Africa/Accra";

  return {
    fields: {
      course_id,
      name,
      slug,
      description: ((formData.get("description") as string) || "").trim(),
      price: Math.round(priceRaw * 100) / 100,
      currency,
      capacity: Math.round(capacityRaw),
      enrollment_opens_at,
      enrollment_closes_at,
      starts_at,
      ends_at,
      timezone,
      post_access_days,
      coupon_codes: coupons,
    },
  };
}

function dbErrorMessage(message: string, code?: string): string {
  if (code === "23505") {
    return "That slug is already used for this course. Choose another.";
  }
  return message;
}

/** Instructor (of the course) or admin creates a cohort */
export async function createCohortAction(
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireContentEditor();
  if (auth.error || !auth.supabase) return { error: auth.error || "Forbidden" };
  const { supabase, userId, role } = auth;

  const validation = parseCohortFields(formData);
  if (validation.error || !validation.fields) {
    return { error: validation.error || "Invalid input" };
  }

  const access = await verifyCourseOwnership(
    supabase,
    validation.fields.course_id,
    userId,
    role
  );
  if (access.error) return { error: access.error };

  const statusRaw = ((formData.get("status") as string) || "draft").trim();
  const status = COHORT_STATUSES.includes(statusRaw) ? statusRaw : "draft";

  const { data: created, error } = await supabase
    .from("cohorts")
    .insert({ ...validation.fields, status })
    .select("id")
    .single();

  if (error || !created) {
    return {
      error: dbErrorMessage(
        error?.message || "Failed to create cohort",
        error?.code
      ),
    };
  }

  await logAudit(supabase, userId, "cohort.created", "cohort", created.id, {
    course_id: validation.fields.course_id,
    name: validation.fields.name,
    price: validation.fields.price,
    currency: validation.fields.currency,
  });

  revalidatePath("/manage/cohorts");
  revalidatePath("/admin/cohorts");
  redirect(`/manage/cohorts/${created.id}`);
}

/** Instructor (of the course) or admin edits cohort details, pricing, and coupons */
export async function updateCohortAction(
  formData: FormData
): Promise<ActionResult> {
  const cohortId = formData.get("cohortId") as string;
  if (!cohortId) return { error: "Missing cohort id" };

  const auth = await requireContentEditor();
  if (auth.error || !auth.supabase) return { error: auth.error || "Forbidden" };
  const { supabase, userId, role } = auth;

  const { data: cohort } = await supabase
    .from("cohorts")
    .select("id, course_id, status")
    .eq("id", cohortId)
    .maybeSingle();

  if (!cohort) return { error: "Cohort not found" };

  const access = await verifyCourseOwnership(
    supabase,
    cohort.course_id,
    userId,
    role
  );
  if (access.error) return { error: access.error };

  const validation = parseCohortFields(formData);
  if (validation.error || !validation.fields) {
    return { error: validation.error || "Invalid input" };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { course_id: _courseId, ...updates } = validation.fields;

  const { error } = await supabase
    .from("cohorts")
    .update(updates)
    .eq("id", cohortId);

  if (error) return { error: dbErrorMessage(error.message, error.code) };

  await logAudit(supabase, userId, "cohort.updated", "cohort", cohortId, {
    name: updates.name,
    price: updates.price,
    currency: updates.currency,
    capacity: updates.capacity,
    coupon_count: updates.coupon_codes.length,
  });

  revalidatePath("/manage/cohorts");
  revalidatePath("/admin/cohorts");
  revalidatePath(`/manage/cohorts/${cohortId}`);
  return { success: true };
}

/** Admin deletes a cohort (blocked when it has enrollments) */
export async function deleteCohortAction(
  formData: FormData
): Promise<ActionResult> {
  const cohortId = formData.get("cohortId") as string;
  if (!cohortId) return { error: "Missing cohort id" };

  const auth = await requireContentEditor();
  if (auth.error || !auth.supabase) return { error: auth.error || "Forbidden" };
  const { supabase, userId, role } = auth;

  const { data: cohort } = await supabase
    .from("cohorts")
    .select("id, course_id, name, status")
    .eq("id", cohortId)
    .maybeSingle();

  if (!cohort) return { error: "Cohort not found" };

  const access = await verifyCourseOwnership(
    supabase,
    cohort.course_id,
    userId,
    role
  );
  if (access.error) return { error: access.error };

  if (cohort.status !== "draft") {
    return {
      error: "Only draft cohorts can be deleted. Archive it instead.",
    };
  }

  const { count } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("cohort_id", cohortId);

  if ((count || 0) > 0) {
    return { error: "This cohort has enrollments and cannot be deleted" };
  }

  const { error } = await supabase.from("cohorts").delete().eq("id", cohortId);
  if (error) return { error: error.message };

  await logAudit(supabase, userId, "cohort.deleted", "cohort", cohortId, {
    name: cohort.name,
    course_id: cohort.course_id,
  });

  revalidatePath("/manage/cohorts");
  revalidatePath("/admin/cohorts");
  return { success: true };
}
