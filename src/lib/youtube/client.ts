type TokenCache = { token: string; expiresAt: number };

let cache: TokenCache | null = null;

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

function getCredentials() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN"
    );
  }
  return { clientId, clientSecret, refreshToken };
}

/** Exchange the stored refresh token for a short-lived access token. */
export async function getYouTubeAccessToken(): Promise<string> {
  if (cache && cache.expiresAt > Date.now() + 60_000) {
    return cache.token;
  }

  const { clientId, clientSecret, refreshToken } = getCredentials();

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `YouTube token refresh failed: ${res.status} ${await res.text()}`
    );
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in?: number;
  };

  cache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cache.token;
}

/** Authenticated JSON request against the YouTube Data API v3. */
export async function youtubeRequest<T>(
  path: string,
  options: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown } = {}
): Promise<T> {
  const token = await getYouTubeAccessToken();
  const res = await fetch(`https://www.googleapis.com/youtube/v3${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `YouTube API ${path} failed: ${res.status} ${await res.text()}`
    );
  }
  return (await res.json()) as T;
}

export function hasYouTubeCredentials(): boolean {
  return Boolean(
    process.env.YOUTUBE_CLIENT_ID &&
      process.env.YOUTUBE_CLIENT_SECRET &&
      process.env.YOUTUBE_REFRESH_TOKEN
  );
}
