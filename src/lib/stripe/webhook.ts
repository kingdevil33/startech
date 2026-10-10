import Stripe from "stripe";
import { getStripe } from "./client";

/**
 * Verify a Stripe webhook payload and return the typed event.
 * Throws if the signature is missing, malformed, or does not match.
 */
export function verifyStripeWebhook(
  body: string,
  signature: string | null
): Stripe.Event {
  if (!signature) {
    throw new Error("Missing stripe-signature header");
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  }
  return getStripe().webhooks.constructEvent(body, signature, secret);
}
