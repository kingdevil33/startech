import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";
import { RATE_LIMITS } from "./constants";

// Redis client, created on first use only — so importing this module never
// throws when Upstash env vars are not configured.
let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    if (
      !process.env.UPSTASH_REDIS_REST_URL ||
      !process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      throw new Error("Upstash Redis environment variables are not set");
    }
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

const limiters = new Map<string, Ratelimit>();

function makeLimiter(
  name: string,
  requests: number,
  window: Duration
): Ratelimit {
  let limiter = limiters.get(name);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(requests, window),
      analytics: true,
      prefix: `ratelimit:${name}`,
    });
    limiters.set(name, limiter);
  }
  return limiter;
}

/** Rate limiter for auth endpoints (login, signup) */
export function authRateLimit(): Ratelimit {
  return makeLimiter(
    "auth",
    RATE_LIMITS.AUTH.requests,
    RATE_LIMITS.AUTH.window
  );
}

/** Rate limiter for forum posts */
export function forumRateLimit(): Ratelimit {
  return makeLimiter(
    "forum",
    RATE_LIMITS.FORUM_POST.requests,
    RATE_LIMITS.FORUM_POST.window
  );
}

/** Rate limiter for AI chat */
export function aiRateLimit(): Ratelimit {
  return makeLimiter(
    "ai",
    RATE_LIMITS.AI_CHAT.requests,
    RATE_LIMITS.AI_CHAT.window
  );
}

/** Rate limiter for general API endpoints */
export function apiRateLimit(): Ratelimit {
  return makeLimiter(
    "api",
    RATE_LIMITS.API_GENERAL.requests,
    RATE_LIMITS.API_GENERAL.window
  );
}

/**
 * Check rate limit and return result.
 * The limiter factory is invoked inside the try block, so a missing Upstash
 * configuration fails open instead of crashing the request.
 */
export async function checkRateLimit(
  getLimiter: () => Ratelimit,
  identifier: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  try {
    const result = await getLimiter().limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    // If Redis is down, allow the request (fail open)
    console.error("Rate limit check failed:", error);
    return { success: true, remaining: -1, reset: 0 };
  }
}

/**
 * Best-effort client IP for identifying anonymous requests (auth actions).
 * Returns "unknown" when headers are unavailable.
 */
export async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    return h.get("x-real-ip") || "unknown";
  } catch {
    return "unknown";
  }
}
