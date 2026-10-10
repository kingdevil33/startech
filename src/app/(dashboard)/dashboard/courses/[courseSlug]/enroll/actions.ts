"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startEnrollmentCheckout } from "@/lib/checkout";
import { sendEnrollmentConfirmedEmail } from "@/lib/email/client";

type EnrollResult = { error?: string };

/**
 * Enroll in a cohort:
 * 1. reserve_seat() atomically holds a spot
 * 2. free → activate immediately
 * 3. paid → create a gateway checkout session and redirect
 */
export async function enrollAction(formData: FormData): Promise<EnrollResult> {
  const cohortId = String(formData.get("cohortId") || "");
  const couponCode = String(formData.get("couponCode") || "").trim() || null;
  const gateway =
    String(formData.get("gateway") || "paystack") === "stripe"
      ? "stripe"
      : "paystack";

  if (!cohortId) return { error: "Missing cohort" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Please sign in to enroll" };

  const result = await startEnrollmentCheckout({
    userId: user.id,
    userEmail: user.email,
    cohortId,
    gateway,
    couponCode,
  });

  if ("error" in result) return { error: result.error };

  if (result.free) {
    const { data: cohort } = await supabase
      .from("cohorts")
      .select("name, course:courses (title, slug)")
      .eq("id", cohortId)
      .single();

    const courseRel = Array.isArray(cohort?.course)
      ? (cohort?.course as unknown as { title?: string; slug?: string }[])[0]
      : (cohort?.course as unknown as { title?: string; slug?: string } | null);

    await supabase.rpc("create_notification", {
      p_user_id: user.id,
      p_type: "enrollment_confirmed",
      p_title: "Enrollment Confirmed!",
      p_body: `You're enrolled in ${courseRel?.title ?? "the course"}.`,
      p_link: `/dashboard/courses/${courseRel?.slug ?? ""}`,
      p_cohort_id: cohortId,
    });

    if (user.email && courseRel) {
      await sendEnrollmentConfirmedEmail(user.email, {
        courseTitle: courseRel.title || "Course",
        cohortName: cohort?.name || "",
        amount: 0,
        currency: "GHS",
      });
    }

    redirect(result.url);
  }

  redirect(result.url);
}
