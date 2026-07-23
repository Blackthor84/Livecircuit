import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Bucket = { count: number; resetAt: number };

const memoryBuckets = new Map<string, Bucket>();
const upstashLimiters = new Map<string, Ratelimit>();

export function isRedisRateLimitConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  const bucket = memoryBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterMs: Math.max(0, bucket.resetAt - now) };
  }

  bucket.count += 1;
  return { ok: true };
}

function getUpstashLimiter(limit: number, windowMs: number): Ratelimit {
  const cacheKey = `${limit}:${windowMs}`;
  let limiter = upstashLimiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      prefix: "livecircuit",
    });
    upstashLimiters.set(cacheKey, limiter);
  }
  return limiter;
}

/** Distributed when Upstash is configured; in-memory fallback for local dev. */
export async function rateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000
): Promise<{ ok: true } | { ok: false; retryAfterMs: number }> {
  if (isRedisRateLimitConfigured()) {
    try {
      const result = await getUpstashLimiter(limit, windowMs).limit(key);
      if (!result.success) {
        const retryAfterMs = Math.max(0, result.reset - Date.now());
        return { ok: false, retryAfterMs };
      }
      return { ok: true };
    } catch (error) {
      console.error("[rateLimit] Upstash error, falling back to memory", error);
    }
  }

  return memoryRateLimit(key, limit, windowMs);
}

/** @deprecated use async rateLimit */
export function rateLimitSync(key: string, limit = 60, windowMs = 60_000) {
  return memoryRateLimit(key, limit, windowMs);
}

export function clientRateLimitKey(request: Request, suffix: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${forwarded ?? "anon"}:${suffix}`;
}

export function resetMemoryRateLimitsForTests() {
  memoryBuckets.clear();
}
