import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

// Rate limiter is only available when Upstash env vars are configured.
// Falls back to no-op when missing (e.g. local development).
function createRateLimiter(requests: number, window: string) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(requests, window as Parameters<typeof Ratelimit.slidingWindow>[1]),
    analytics: true,
    prefix: "ratelimit",
  });
}

// Login: 5 attempts per 15 minutes per IP
const loginLimiter = () => createRateLimiter(5, "15 m");

// Register: 3 attempts per hour per IP
const registerLimiter = () => createRateLimiter(3, "1 h");

// Refresh: 20 attempts per 15 minutes per IP
const refreshLimiter = () => createRateLimiter(20, "15 m");

const limiters = {
  login: loginLimiter,
  register: registerLimiter,
  refresh: refreshLimiter,
} as const;

type LimiterName = keyof typeof limiters;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Check rate limit for a given endpoint.
 * Returns a 429 Response if the limit is exceeded, or null if allowed.
 * Returns null (allows) if Upstash is not configured (local dev).
 */
export async function checkRateLimit(
  req: NextRequest,
  name: LimiterName,
): Promise<NextResponse | null> {
  const limiter = limiters[name]();
  if (!limiter) return null; // Upstash not configured → allow

  const ip = getClientIp(req);
  const { success, limit, remaining, reset } = await limiter.limit(`${name}:${ip}`);

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(reset),
          "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
        },
      },
    );
  }

  return null;
}
