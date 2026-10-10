import crypto from "crypto";

const TOLERANCE_SECONDS = 5 * 60;

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify the `mux-signature` header.
 * Mux signs `${t}.${body}` with HMAC-SHA256 using the secret; some older
 * integrations send a bare HMAC of the raw body — both are supported.
 *
 * Returns true when no secret is configured (dev only) but logs loudly.
 */
export function verifyMuxWebhook(
  body: string,
  header: string | null
): boolean {
  const secret = process.env.MUX_WEBHOOK_SECRET;
  if (!secret) {
    console.warn(
      "MUX_WEBHOOK_SECRET is not set — webhook signature verification is skipped"
    );
    return true;
  }
  if (!header) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  if (!header.includes("=")) {
    return safeEqual(header, expected);
  }

  const parts = header.split(",").reduce<Record<string, string>>((acc, p) => {
    const [k, v] = p.split("=");
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) return false;

  const signed = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  return safeEqual(signature, signed);
}
