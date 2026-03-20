/**
 * Aegis Bridge — In-memory rate limiter
 * Simple sliding-window limiter for the /api/triage endpoint.
 * Per-IP, server-side only. Resets on cold start (acceptable for hackathon).
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();
const WINDOW_MS = 60_000; // 1 minute sliding window

function getLimit(): number {
  const env = process.env.TRIAGE_RATE_LIMIT_PER_MINUTE;
  const parsed = parseInt(env ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

/**
 * Returns true if the request is within rate limit.
 * @param identifier - typically the client IP
 */
export function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
  const limit = getLimit();
  const now = Date.now();
  let entry = store.get(identifier);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    store.set(identifier, entry);
  }

  entry.count += 1;

  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}
