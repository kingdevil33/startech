import type { NextRequest } from "next/server";

/**
 * Authenticate scheduled/cron callers.
 * Both `Authorization: Bearer <CRON_SECRET>` and `x-cron-secret: <CRON_SECRET>`
 * are accepted (Vercel Cron sends the former).
 */
export function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const header = request.headers.get("x-cron-secret");
  if (header === secret) return true;

  return false;
}

export const CRON_UNAUTHORIZED = {
  json: { error: "Unauthorized" },
  status: 401 as const,
};
