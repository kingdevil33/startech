import crypto from "crypto";

/**
 * Verify the `x-paystack-signature` header: HMAC-SHA512 of the raw body
 * using the secret key, compared in constant time.
 */
export function verifyPaystackWebhook(
  body: string,
  signature: string | null
): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    throw new Error("Missing PAYSTACK_SECRET_KEY");
  }
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha512", secret)
    .update(body)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
