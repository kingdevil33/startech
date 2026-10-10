import type { SupabaseClient } from "@supabase/supabase-js";
import {
  sendEnrollmentConfirmedEmail,
  sendRefundProcessedEmail,
  sendReviewAssignedEmail,
  sendWelcomeEmail,
} from "./client";

type Db = SupabaseClient;

async function resolveEnrollmentContext(
  db: Db,
  enrollmentId: string
): Promise<{
  email: string | null;
  fullName: string | null;
  courseTitle: string;
  cohortName: string;
} | null> {
  const { data: enrollment } = await db
    .from("enrollments")
    .select("id, user_id, cohort_id")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (!enrollment) return null;

  const [{ data: profile }, { data: cohort }] = await Promise.all([
    db.from("profiles").select("email, full_name").eq("id", enrollment.user_id).maybeSingle(),
    db
      .from("cohorts")
      .select("name, course:courses (title)")
      .eq("id", enrollment.cohort_id)
      .maybeSingle(),
  ]);

  const course = Array.isArray(cohort?.course)
    ? (cohort?.course as unknown as { title?: string }[])[0]
    : (cohort?.course as unknown as { title?: string } | null);

  return {
    email: profile?.email ?? null,
    fullName: profile?.full_name ?? null,
    courseTitle: course?.title ?? "your course",
    cohortName: cohort?.name ?? "",
  };
}

/**
 * Sends the enrollment-confirmation email for a paid (or free) enrollment.
 * Fails soft: the webhook flow must never break on an email problem.
 */
export async function notifyEnrollmentConfirmed(
  db: Db,
  enrollmentId: string,
  payment: { amount: number; currency: string }
): Promise<void> {
  try {
    const context = await resolveEnrollmentContext(db, enrollmentId);
    if (!context?.email) return;

    await sendEnrollmentConfirmedEmail(context.email, {
      courseTitle: context.courseTitle,
      cohortName: context.cohortName,
      amount: payment.amount,
      currency: payment.currency,
    });
  } catch (err) {
    console.error("Enrollment confirmation email failed:", err);
  }
}

/** Sends the refund-processed email for a payment. Fails soft. */
export async function notifyRefundProcessed(
  db: Db,
  paymentId: string,
  details: { amount: number; currency: string; reason?: string | null }
): Promise<void> {
  try {
    const { data: payment } = await db
      .from("payments")
      .select("user_id")
      .eq("id", paymentId)
      .maybeSingle();
    if (!payment) return;

    const { data: profile } = await db
      .from("profiles")
      .select("email")
      .eq("id", payment.user_id)
      .maybeSingle();
    if (!profile?.email) return;

    const { data: enrollment } = await db
      .from("enrollments")
      .select("cohort_id, cohort:cohorts (name, course:courses (title))")
      .eq("user_id", payment.user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const cohort = Array.isArray(enrollment?.cohort)
      ? (enrollment?.cohort as unknown as {
          name?: string;
          course?: unknown;
        }[])[0]
      : (enrollment?.cohort as unknown as
          | { name?: string; course?: unknown }
          | null);

    const course = Array.isArray(cohort?.course)
      ? (cohort?.course as unknown as { title?: string }[])[0]
      : (cohort?.course as unknown as { title?: string } | null);

    await sendRefundProcessedEmail(profile.email, {
      courseTitle: course?.title ?? "your course",
      amount: details.amount,
      currency: details.currency,
      reason: details.reason ?? null,
    });
  } catch (err) {
    console.error("Refund email failed:", err);
  }
}

/** Sends the welcome email after a new account is created. Fails soft. */
export async function notifyWelcome(
  email: string,
  fullName: string | null
): Promise<void> {
  try {
    await sendWelcomeEmail(email, fullName || "there");
  } catch (err) {
    console.error("Welcome email failed:", err);
  }
}

/**
 * Emails every reviewer that was just assigned peer reviews for a submission.
 * Fails soft.
 */
export async function notifyReviewersAssigned(
  db: Db,
  submissionId: string,
  params: { assignmentTitle: string; dueAt?: string | null }
): Promise<void> {
  try {
    const { data: assignments } = await db
      .from("review_assignments")
      .select("id, reviewer_id, created_at, profile:profiles (email)")
      .eq("submission_id", submissionId)
      .eq("status", "pending")
      .gte("created_at", new Date(Date.now() - 5 * 60_000).toISOString());

    for (const assignment of assignments ?? []) {
      const profile = Array.isArray(assignment.profile)
        ? (assignment.profile as unknown as { email?: string }[])[0]
        : (assignment.profile as unknown as { email?: string } | null);

      if (!profile?.email) continue;

      await sendReviewAssignedEmail(profile.email, {
        assignmentTitle: params.assignmentTitle,
        dueAt: params.dueAt ?? null,
        reviewCount: 1,
      });
    }
  } catch (err) {
    console.error("Review assignment email failed:", err);
  }
}
