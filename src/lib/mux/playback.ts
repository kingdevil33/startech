import { getMux } from "./client";

export type PlaybackTokenParams = {
  playbackId: string;
  /** JWT lifetime, e.g. "15m", "1h" */
  expiration?: string;
  type?: "video" | "thumbnail" | "gif" | "storyboard";
};

/**
 * Sign a Mux playback ID so only our app can play the video.
 * Returns `null` when signing keys are not configured, so callers can
 * fall back to the unsigned playback ID for public assets.
 */
export async function signPlaybackToken(
  params: PlaybackTokenParams
): Promise<string | null> {
  const keyId = process.env.MUX_SIGNING_KEY_ID;
  const rawKey = process.env.MUX_SIGNING_PRIVATE_KEY;
  if (!keyId || !rawKey) return null;

  const keySecret = rawKey.includes("BEGIN")
    ? rawKey
    : Buffer.from(rawKey, "base64").toString("utf8");

  try {
    return await getMux().jwt.signPlaybackId(params.playbackId, {
      keyId,
      keySecret,
      expiration: params.expiration ?? "1h",
      type: params.type ?? "video",
    });
  } catch (err) {
    console.error("Mux playback token signing failed:", err);
    return null;
  }
}
