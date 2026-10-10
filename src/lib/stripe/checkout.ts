import type Stripe from "stripe";
import { getStripe } from "./client";

export type CheckoutMetadata = {
  enrollment_id: string;
  user_id: string;
  cohort_id: string;
  coupon_code?: string;
  discount_amount?: string;
};

export type EnrollmentCheckoutParams = {
  metadata: CheckoutMetadata;
  amount: number; // major units, e.g. 450.00 GHS
  currency: string;
  productName: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
};

/**
 * Create a Stripe Checkout Session for a one-time enrollment payment.
 * Returns the session so the caller can persist `session.id` as
 * `payments.gateway_session_id` before redirecting the browser.
 */
export async function createEnrollmentCheckoutSession(
  params: EnrollmentCheckoutParams
): Promise<Stripe.Checkout.Session> {
  return getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: params.customerEmail,
    line_items: [
      {
        price_data: {
          currency: params.currency.toLowerCase(),
          product_data: { name: params.productName },
          unit_amount: Math.round(params.amount * 100),
        },
        quantity: 1,
      },
    ],
    metadata: params.metadata,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });
}

/** Refund a Stripe payment intent (admin-initiated). */
export async function refundStripePayment(
  paymentIntentId: string,
  amount?: number
): Promise<Stripe.Refund> {
  return getStripe().refunds.create({
    payment_intent: paymentIntentId,
    ...(amount !== undefined ? { amount: Math.round(amount * 100) } : {}),
  });
}
