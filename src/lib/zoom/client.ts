type TokenCache = { token: string; expiresAt: number };

let cache: TokenCache | null = null;

const ZOOM_OAUTH_URL = "https://zoom.us/oauth/token";

function getCredentials() {
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  if (!clientId || !clientSecret || !accountId) {
    throw new Error(
      "Missing ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET / ZOOM_ACCOUNT_ID"
    );
  }
  return { clientId, clientSecret, accountId };
}

/**
 * Server-to-server OAuth: exchange account credentials for a short-lived
 * access token. Cached in module scope (tokens last ~1 hour).
 */
export async function getZoomAccessToken(): Promise<string> {
  if (cache && cache.expiresAt > Date.now() + 60_000) {
    return cache.token;
  }

  const { clientId, clientSecret, accountId } = getCredentials();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(
    `${ZOOM_OAUTH_URL}?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: "POST",
      headers: { Authorization: `Basic ${basic}` },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(`Zoom OAuth failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  cache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cache.token;
}

/** Authenticated JSON request against the Zoom API. */
export async function zoomRequest<T>(
  path: string,
  options: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown } = {}
): Promise<T> {
  const token = await getZoomAccessToken();
  const res = await fetch(`https://api.zoom.us/v2${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Zoom API ${path} failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export function hasZoomCredentials(): boolean {
  return Boolean(
    process.env.ZOOM_CLIENT_ID &&
      process.env.ZOOM_CLIENT_SECRET &&
      process.env.ZOOM_ACCOUNT_ID
  );
}
