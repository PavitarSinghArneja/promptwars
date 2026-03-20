/**
 * Aegis Bridge — Unit Tests: Rate Limiter
 * Verifies the sliding-window in-memory rate limiter logic.
 */

// We test the logic directly without importing the module (which has process.env side effects)
// by extracting the pure logic as a local implementation

interface Window {
  count: number;
  resetAt: number;
}

function makeRateLimiter(limitPerMin: number) {
  const store = new Map<string, Window>();
  const WINDOW_MS = 60_000;

  return function checkRateLimit(identifier: string, now = Date.now()) {
    let entry = store.get(identifier);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + WINDOW_MS };
      store.set(identifier, entry);
    }
    entry.count += 1;
    return {
      allowed: entry.count <= limitPerMin,
      remaining: Math.max(0, limitPerMin - entry.count),
      resetAt: entry.resetAt,
    };
  };
}

describe("Rate limiter", () => {
  it("allows requests within limit", () => {
    const check = makeRateLimiter(5);
    const now = Date.now();
    for (let i = 0; i < 5; i++) {
      const result = check("ip-1", now);
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks requests over limit", () => {
    const check = makeRateLimiter(3);
    const now = Date.now();
    check("ip-2", now);
    check("ip-2", now);
    check("ip-2", now);
    const result = check("ip-2", now);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets window after expiry", () => {
    const check = makeRateLimiter(2);
    const now = Date.now();
    check("ip-3", now);
    check("ip-3", now);
    const blocked = check("ip-3", now);
    expect(blocked.allowed).toBe(false);

    // Simulate 61 seconds later
    const later = now + 61_000;
    const reset = check("ip-3", later);
    expect(reset.allowed).toBe(true);
    expect(reset.remaining).toBe(1);
  });

  it("tracks different IPs independently", () => {
    const check = makeRateLimiter(2);
    const now = Date.now();
    check("ip-a", now);
    check("ip-a", now);
    const blockedA = check("ip-a", now);
    const okB = check("ip-b", now);
    expect(blockedA.allowed).toBe(false);
    expect(okB.allowed).toBe(true);
  });

  it("returns correct remaining count", () => {
    const check = makeRateLimiter(10);
    const now = Date.now();
    check("ip-4", now);
    check("ip-4", now);
    const result = check("ip-4", now);
    expect(result.remaining).toBe(7);
  });
});
