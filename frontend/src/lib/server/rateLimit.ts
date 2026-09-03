/**
 * Simple in-memory, sliding-window rate limiter.
 *
 * In-memory is a deliberate, currently-correct choice: this app runs as a
 * single Node process (one Railway service, no horizontal scaling). If that
 * ever changes, this needs to move to a shared store (e.g. a Supabase
 * table) — each instance would otherwise track its own independent counter
 * and under-count the true combined rate.
 *
 * Built for api/ai/generate-test-package and api/ai/parse-atrd: both call
 * OpenAI, both cost real money per call, and — unlike most routes in this
 * app — a signed-up user can hit them as many times as they want with no
 * throttle today.
 */

const requestLog = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  /** Only set when allowed is false — how long until the next request would succeed. */
  retryAfterSeconds?: number;
}

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
}

const DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_MAX = 10;

/**
 * `key` should already be scoped to whatever you want limited together —
 * e.g. `ai:${userId}` so multiple routes can share one budget.
 */
export function checkRateLimit(key: string, opts: RateLimitOptions = {}): RateLimitResult {
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const max = opts.max ?? DEFAULT_MAX;
  const now = Date.now();

  const timestamps = (requestLog.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= max) {
    requestLog.set(key, timestamps); // keep the pruned list even when rejecting
    const oldestInWindow = timestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - oldestInWindow)) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  timestamps.push(now);
  requestLog.set(key, timestamps);
  return { allowed: true };
}

// Periodic cleanup so the map doesn't grow unbounded with stale entries from
// users who only ever made a handful of requests once, long ago.
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of requestLog) {
    const fresh = timestamps.filter((t) => now - t < DEFAULT_WINDOW_MS);
    if (fresh.length === 0) requestLog.delete(key);
    else requestLog.set(key, fresh);
  }
}, 10 * 60 * 1000);
cleanupTimer.unref?.();
