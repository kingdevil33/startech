import crypto from "crypto";

/**
 * Zoom webhook verification.
 *
 * Two header flavours exist depending on account config:
 *  - Unencrypted: `authorization` is the plain secret token.
 *  - Encrypted:   `authorization` is HMAC-SHA256 of the body using the
 *                 secret token as the key (v2.0 style), or
 *                 HMAC-SHA256(`plainToken`, secret) during URL validation.
 */
export function verifyZoomWebhook(body: string, authorization: string | null): boolean {
  const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
  if (!secret) {
    console.warn(
      "ZOOM_WEBHOOK_SECRET_TOKEN is not set — webhook verification is skipped"
    );
    return true;
  }
  if (!authorization) return false;

  if (safeEqual(authorization, secret)) return true;

  const expectedBody = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  if (safeEqual(authorization.toLowerCase(), expectedBody)) return true;

  // URL-validation challenge: payload is { plainToken }
  try {
    const parsed = JSON.parse(body) as { plainToken?: string };
    if (parsed.plainToken) {
      const expectedToken = crypto
        .createHmac("sha256", secret)
        .update(parsed.plainToken)
        .digest("hex");
      return safeEqual(authorization.toLowerCase(), expectedToken);
    }
  } catch {
    // not JSON — fall through
  }

  return false;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
