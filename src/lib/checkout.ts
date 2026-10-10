import Stripe from "stripe";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createEnrollmentCheckoutSession } from "@/lib/stripe/checkout";
import { initializePaystackTransaction } from "@/lib/paystack/checkout";

type Gateway = "stripe" | "paystack";

export type CouponRow = {
  code: string;
  discount_percent: number;
  max_uses: number;
  used: number;
};

export type CheckoutInput = {
  userId: string;
  userEmail: string | undefined;
  cohortId: string;
  gateway: Gateway;
  couponCode?: string | null;
};

export type CheckoutOutcome =
  | { url: string; enrollmentId: string; free: boolean }
  | { error: string };

function adminSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/** Apply a coupon code to a price, if valid and unused. */
export function applyCoupon(
  price: number,
  couponCode: string | null | undefined,
  couponCodes: CouponRow[] | null | undefined
): { finalPrice: number; discountAmount: number } {
  let finalPrice = price;
  let discountAmount = 0;

  if (couponCode && Array.isArray(couponCodes)) {
    const coupon = couponCodes.find(
      (c) =>
        c.code.toUpperCase() === couponCode.toUpperCase() &&
        c.used < c.max_uses
    );
    if (coupon) {
      discountAmount = (price * coupon.discount_percent) / 100;
      finalPrice = price - discountAmount;
    }
  }

  return { finalPrice, discountAmount };
}

/**
 * Shared enrollment checkout flow used by both the server action and
 * POST /api/checkout:
 *   reserve seat → price coupon → free / Paystack / Stripe → payment row
 *
 * The caller is responsible for redirecting the browser to `url`.
 */
export async function startEnrollmentCheckout(
  input: CheckoutInput
): Promise<CheckoutOutcome> {
  const { userId, userEmail, cohortId, gateway } = input;
  const couponCode = input.couponCode?.trim() || null;

  // Service-role client: the seat reservation is an RPC that must succeed
  // even when RLS would otherwise block cross-row writes.
  const supabase = adminSupabase();

  const { data: cohort, error: cohortError } = await supabase
    .from("cohorts")
    .select("*, course:courses (title, slug)")
    .eq("id", cohortId)
    .single();

  if (cohortError || !cohort) {
    return { error: "Cohort not found" };
  }

  const { data: enrollmentId, error: reserveError } = await supabase.rpc(
    "reserve_seat",
    { p_user_id: userId, p_cohort_id: cohortId }
  );

  if (reserveError || !enrollmentId) {
    return { error: reserveError?.message || "Could not reserve a seat" };
  }

  const { finalPrice, discountAmount } = applyCoupon(
    Number(cohort.price),
    couponCode,
    cohort.coupon_codes
  );

  const metadata = {
    enrollment_id: enrollmentId as string,
    user_id: userId,
    cohort_id: cohortId,
    coupon_code: couponCode || "",
    discount_amount: String(discountAmount),
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const successUrl = `${appUrl}/dashboard/courses/${cohort.course?.slug}?enrolled=true`;
  const cancelUrl = `${appUrl}/courses/${cohort.course?.slug}?cancelled=true`;

  // ---- Free enrollment ----
  if (finalPrice <= 0) {
    await supabase
      .from("enrollments")
      .update({ status: "active", reserved_until: null })
      .eq("id", enrollmentId);

    await supabase.from("payments").insert({
      enrollment_id: enrollmentId,
      user_id: userId,
      cohort_id: cohortId,
      amount: 0,
      currency: cohort.currency,
      gateway: "free",
      status: "completed",
      coupon_code: couponCode,
      discount_amount: discountAmount,
    });

    return { url: successUrl, enrollmentId: enrollmentId as string, free: true };
  }

  // ---- Paystack ----
  if (gateway === "paystack") {
    if (!userEmail) return { error: "Missing account email" };

    let paymentUrl: string;
    let reference: string;
    try {
      const init = await initializePaystackTransaction({
        email: userEmail,
        amount: finalPrice,
        currency: cohort.currency,
        metadata,
        callbackUrl: successUrl,
      });
      paymentUrl = init.authorization_url;
      reference = init.reference;
    } catch (err) {
      return {
        error: err instanceof Error
          ? err.message
          : "Could not start Paystack checkout",
      };
    }

    const { error: payError } = await supabase.from("payments").insert({
      enrollment_id: enrollmentId,
      user_id: userId,
      cohort_id: cohortId,
      amount: finalPrice,
      currency: cohort.currency,
      gateway: "paystack",
      status: "pending",
      gateway_session_id: reference,
      coupon_code: couponCode,
      discount_amount: discountAmount,
    });
    if (payError) return { error: payError.message };

    return { url: paymentUrl, enrollmentId: enrollmentId as string, free: false };
  }

  // ---- Stripe ----
  let session: Stripe.Checkout.Session;
  try {
    session = await createEnrollmentCheckoutSession({
      metadata,
      amount: finalPrice,
      currency: cohort.currency,
      productName: `${cohort.course?.title ?? "Course"} — ${cohort.name ?? ""}`.trim(),
      customerEmail: userEmail,
      successUrl,
      cancelUrl,
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Payment setup failed",
    };
  }

  if (!session.url) return { error: "Could not start Stripe checkout" };

  const { error: payError } = await supabase.from("payments").insert({
    enrollment_id: enrollmentId,
    user_id: userId,
    cohort_id: cohortId,
    amount: finalPrice,
    currency: cohort.currency,
    gateway: "stripe",
    status: "pending",
    gateway_session_id: session.id,
    coupon_code: couponCode,
    discount_amount: discountAmount,
  });
  if (payError) return { error: payError.message };

  return { url: session.url, enrollmentId: enrollmentId as string, free: false };
}
