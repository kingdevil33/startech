"use server";

import { revalidatePath } from "next/cache";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyRefundProcessed } from "@/lib/email/notify";

type ActionResult = { success?: boolean; error?: string };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" as const, supabase: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "Forbidden" as const, supabase: null };

  return { error: null, supabase, userId: user.id };
}

async function logAudit(
  supabase: NonNullable<Awaited<ReturnType<typeof requireAdmin>>["supabase"]>,
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

/** Publish / unpublish a course (admin, or the course's own instructor) */
export async function toggleCoursePublishAction(
  formData: FormData
): Promise<ActionResult> {
  const courseId = formData.get("courseId") as string;
  const current = formData.get("isPublished") === "true";
  if (!courseId) return { error: "Missing course id" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const { data: course } = await supabase
    .from("courses")
    .select("id, instructor_id")
    .eq("id", courseId)
    .single();

  if (!course) return { error: "Course not found" };

  const isAdmin = profile?.role === "admin";
  const isInstructor =
    (profile?.role === "instructor" || profile?.role === "teaching_assistant") &&
    course.instructor_id === user.id;

  if (!isAdmin && !isInstructor) return { error: "Forbidden" };

  const { error } = await supabase
    .from("courses")
    .update({ is_published: !current })
    .eq("id", courseId);

  if (error) return { error: error.message };

  await logAudit(supabase, user.id, "course.publish_toggle", "course", courseId, {
    is_published: !current,
  });

  revalidatePath("/admin/courses");
  revalidatePath("/manage/courses");
  revalidatePath(`/manage/courses/${courseId}`);
  return { success: true };
}

/** Change a user's role */
export async function updateUserRoleAction(
  formData: FormData
): Promise<ActionResult> {
  const userId = formData.get("userId") as string;
  const role = formData.get("role") as string;
  const allowed = ["student", "instructor", "teaching_assistant", "admin"];

  if (!userId || !allowed.includes(role)) return { error: "Invalid input" };

  const auth = await requireAdmin();
  if (auth.error || !auth.supabase) return { error: auth.error || "Forbidden" };
  const { supabase, userId: actorId } = auth;

  if (userId === actorId && role !== "admin") {
    return { error: "You cannot change your own role" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) return { error: error.message };

  await logAudit(supabase, actorId, "user.role_changed", "profile", userId, {
    role,
  });

  revalidatePath("/admin/users");
  return { success: true };
}

/** Toggle a user's active status */
export async function toggleUserActiveAction(
  formData: FormData
): Promise<ActionResult> {
  const userId = formData.get("userId") as string;
  const isActive = formData.get("isActive") === "true";
  if (!userId) return { error: "Missing user id" };

  const auth = await requireAdmin();
  if (auth.error || !auth.supabase) return { error: auth.error || "Forbidden" };
  const { supabase, userId: actorId } = auth;

  if (userId === actorId) return { error: "You cannot deactivate yourself" };

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: !isActive })
    .eq("id", userId);

  if (error) return { error: error.message };

  await logAudit(supabase, actorId, "user.status_changed", "profile", userId, {
    is_active: !isActive,
  });

  revalidatePath("/admin/users");
  return { success: true };
}

/** Refund a payment through its gateway, then mark it refunded */
export async function refundPaymentAction(
  formData: FormData
): Promise<ActionResult> {
  const paymentId = formData.get("paymentId") as string;
  if (!paymentId) return { error: "Missing payment id" };

  const auth = await requireAdmin();
  if (auth.error || !auth.supabase) return { error: auth.error || "Forbidden" };
  const { supabase, userId } = auth;

  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .single();

  if (fetchError || !payment) return { error: "Payment not found" };
  if (payment.status === "refunded") return { error: "Already refunded" };
  if (payment.status !== "completed") {
    return { error: "Only completed payments can be refunded" };
  }

  const amount = Number(payment.amount);
  const refundAmount = amount - Number(payment.refund_amount || 0);

  try {
    if (payment.gateway === "stripe") {
      if (!payment.gateway_payment_id) {
        return { error: "No Stripe payment intent on this record" };
      }
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
      await stripe.refunds.create({
        payment_intent: payment.gateway_payment_id,
        amount: Math.round(refundAmount * 100),
      });
    } else if (payment.gateway === "paystack") {
      if (!payment.gateway_session_id) {
        return { error: "No Paystack reference on this record" };
      }
      const res = await fetch("https://api.paystack.co/refund", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction: payment.gateway_session_id,
          amount: Math.round(refundAmount * 100),
        }),
      });
      const json = await res.json();
      if (!json.status) {
        return { error: json.message || "Paystack refund failed" };
      }
    } else {
      return { error: `Refunds are not supported for ${payment.gateway}` };
    }
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Gateway refund request failed",
    };
  }

  const { error: updateError } = await supabase
    .from("payments")
    .update({
      status: "refunded",
      refund_amount: refundAmount,
      refund_reason: "Admin initiated",
      refunded_at: new Date().toISOString(),
      refunded_by: userId,
    })
    .eq("id", paymentId);

  if (updateError) return { error: updateError.message };

  await supabase
    .from("enrollments")
    .update({ status: "refunded" })
    .eq("id", payment.enrollment_id);

  await supabase.rpc("create_notification", {
    p_user_id: payment.user_id,
    p_type: "refund_processed",
    p_title: "Refund Processed",
    p_body: `Your refund of ${refundAmount.toFixed(2)} ${payment.currency} has been processed.`,
    p_link: "/dashboard",
  });

  await logAudit(supabase, userId, "payment.refunded", "payment", paymentId, {
    gateway: payment.gateway,
    amount: refundAmount,
  });

  void notifyRefundProcessed(supabase, paymentId, {
    amount: refundAmount,
    currency: payment.currency,
    reason: "Admin initiated",
  });

  revalidatePath("/admin/payments");
  return { success: true };
}

/** Revoke (or restore) a certificate */
export async function revokeCertificateAction(
  formData: FormData
): Promise<ActionResult> {
  const certificateId = formData.get("certificateId") as string;
  const reason = ((formData.get("reason") as string) || "").trim();
  const action = formData.get("action") as string;
  const shouldRevoke = action !== "restore";
  if (!certificateId) return { error: "Missing certificate id" };

  const auth = await requireAdmin();
  if (auth.error || !auth.supabase) return { error: auth.error || "Forbidden" };
  const { supabase, userId } = auth;

  const { error } = await supabase
    .from("certificates")
    .update(
      shouldRevoke
        ? {
            is_revoked: true,
            revoked_at: new Date().toISOString(),
            revoked_by: userId,
            revoke_reason: reason || "Revoked by admin",
          }
        : {
            is_revoked: false,
            revoked_at: null,
            revoked_by: null,
            revoke_reason: null,
          }
    )
    .eq("id", certificateId);

  if (error) return { error: error.message };

  await logAudit(
    supabase,
    userId,
    shouldRevoke ? "certificate.revoked" : "certificate.restored",
    "certificate",
    certificateId,
    { reason }
  );

  revalidatePath("/admin/certificates");
  return { success: true };
}

/** Admin creates a teacher (instructor) account with a temporary password */
export async function createInstructorAction(
  formData: FormData
): Promise<ActionResult> {
  const fullName = ((formData.get("fullName") as string) || "").trim();
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const password = (formData.get("password") as string) || "";
  const role = ((formData.get("role") as string) || "instructor").trim();

  if (!fullName || !email || !password) {
    return { error: "Name, email, and password are required" };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }
  if (!["instructor", "teaching_assistant"].includes(role)) {
    return { error: "Role must be instructor or teaching_assistant" };
  }

  const auth = await requireAdmin();
  if (auth.error || !auth.supabase) return { error: auth.error || "Forbidden" };
  const { supabase, userId: actorId } = auth;

  const admin = createAdminClient();

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

  if (createError || !created.user) {
    return {
      error:
        createError?.message === "A user with this email address has already been registered"
          ? "A user with this email already exists"
          : createError?.message || "Failed to create account",
    };
  }

  // The signup trigger creates the profile with the default student role — promote it.
  const { error: roleError } = await admin
    .from("profiles")
    .update({ role, full_name: fullName })
    .eq("id", created.user.id);

  if (roleError) {
    return {
      error: `Account created but role update failed: ${roleError.message}`,
    };
  }

  await logAudit(supabase, actorId, "user.created", "profile", created.user.id, {
    email,
    role,
    full_name: fullName,
  });

  revalidatePath("/admin/users");
  return { success: true };
}

/** Admin assigns a course to an instructor */
export async function assignInstructorAction(
  formData: FormData
): Promise<ActionResult> {
  const courseId = formData.get("courseId") as string;
  const instructorId = ((formData.get("instructorId") as string) || "").trim();
  if (!courseId) return { error: "Missing course id" };

  const auth = await requireAdmin();
  if (auth.error || !auth.supabase) return { error: auth.error || "Forbidden" };
  const { supabase, userId: actorId } = auth;

  if (instructorId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", instructorId)
      .maybeSingle();

    if (!profile) return { error: "Instructor not found" };
    if (!["instructor", "teaching_assistant", "admin"].includes(profile.role)) {
      return { error: "User is not an instructor" };
    }
  }

  const { error } = await supabase
    .from("courses")
    .update({ instructor_id: instructorId || null })
    .eq("id", courseId);

  if (error) return { error: error.message };

  await logAudit(supabase, actorId, "course.instructor_assigned", "course", courseId, {
    instructor_id: instructorId || null,
  });

  revalidatePath("/admin/courses");
  revalidatePath("/manage/courses");
  return { success: true };
}

/** Admin deletes a course (cascades to weeks/lessons/cohorts) */
export async function deleteCourseAction(
  formData: FormData
): Promise<ActionResult> {
  const courseId = formData.get("courseId") as string;
  if (!courseId) return { error: "Missing course id" };

  const auth = await requireAdmin();
  if (auth.error || !auth.supabase) return { error: auth.error || "Forbidden" };
  const { supabase, userId: actorId } = auth;

  const { data: course } = await supabase
    .from("courses")
    .select("id, title")
    .eq("id", courseId)
    .maybeSingle();

  if (!course) return { error: "Course not found" };

  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) return { error: error.message };

  await logAudit(supabase, actorId, "course.deleted", "course", courseId, {
    title: course.title,
  });

  revalidatePath("/admin/courses");
  revalidatePath("/manage/courses");
  return { success: true };
}
