import Stripe from "stripe";

let stripe: Stripe | null = null;

/**
 * Lazily constructed Stripe client.
 * Throwing here (rather than at module scope) keeps `next build` working
 * when STRIPE_SECRET_KEY is not configured.
 */
export function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
    stripe = new Stripe(key);
  }
  return stripe;
}
