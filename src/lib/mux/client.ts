import Mux from "@mux/mux-node";

let mux: Mux | null = null;

/**
 * Decode the signing private key. The env var may be the raw PEM or a
 * base64-encoded PEM (as documented in .env.example).
 */
function decodePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  if (raw.includes("BEGIN")) return raw;
  try {
    return Buffer.from(raw, "base64").toString("utf8");
  } catch {
    return raw;
  }
}

/** Lazily constructed Mux client. Server-side only. */
export function getMux(): Mux {
  if (!mux) {
    const tokenId = process.env.MUX_TOKEN_ID;
    const tokenSecret = process.env.MUX_TOKEN_SECRET;
    if (!tokenId || !tokenSecret) {
      throw new Error("Missing MUX_TOKEN_ID / MUX_TOKEN_SECRET");
    }
    mux = new Mux({
      tokenId,
      tokenSecret,
      jwtSigningKey: process.env.MUX_SIGNING_KEY_ID || null,
      jwtPrivateKey: decodePrivateKey(process.env.MUX_SIGNING_PRIVATE_KEY),
    });
  }
  return mux;
}

export function hasMuxCredentials(): boolean {
  return Boolean(process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET);
}
