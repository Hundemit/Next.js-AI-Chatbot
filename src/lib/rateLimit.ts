/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Each window tracks request timestamps per IP. Expired entries are lazily
 * cleaned up on the next call.  This is intentionally lightweight — no
 * external dependency required. For high-traffic production use, replace
 * with Upstash Redis or a similar persistent store.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  /** Maximum number of requests allowed within the window. */
  maxRequests: number;
  /** Window size in milliseconds. */
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number | null;
}

/**
 * Check whether a request from `key` (typically the client IP) is within
 * the configured rate limit.
 *
 * @returns An object indicating if the request is allowed, how many
 *          requests remain, and – if blocked – how long to wait.
 */
export function checkRateLimit(
  key: string,
  { maxRequests, windowMs }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + windowMs - now;
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxRequests - entry.timestamps.length,
    retryAfterMs: null,
  };
}

/**
 * Helper that extracts the client IP from a Next.js Request, falling back
 * to a generic key when the IP is unavailable.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}

/** Pre-configured rate limit for chat API (20 req / 60 s per IP). */
export const CHAT_RATE_LIMIT: RateLimitOptions = {
  maxRequests: 20,
  windowMs: 60_000,
};

/** Pre-configured rate limit for suggestions API (30 req / 60 s per IP). */
export const SUGGESTIONS_RATE_LIMIT: RateLimitOptions = {
  maxRequests: 30,
  windowMs: 60_000,
};

/** Pre-configured rate limit for reindex API (3 req / 60 s per IP). */
export const REINDEX_RATE_LIMIT: RateLimitOptions = {
  maxRequests: 3,
  windowMs: 60_000,
};
