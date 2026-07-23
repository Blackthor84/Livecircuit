import { describe, expect, it, beforeEach } from "vitest";
import { rateLimitSync, resetMemoryRateLimitsForTests } from "@/lib/api/rate-limit";

describe("rateLimitSync (memory)", () => {
  beforeEach(() => {
    resetMemoryRateLimitsForTests();
  });

  it("allows requests under the limit", () => {
    const key = "test:user";
    expect(rateLimitSync(key, 3, 60_000).ok).toBe(true);
    expect(rateLimitSync(key, 3, 60_000).ok).toBe(true);
    expect(rateLimitSync(key, 3, 60_000).ok).toBe(true);
  });

  it("blocks when limit exceeded", () => {
    const key = "test:block";
    for (let i = 0; i < 2; i += 1) {
      expect(rateLimitSync(key, 2, 60_000).ok).toBe(true);
    }
    const blocked = rateLimitSync(key, 2, 60_000);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfterMs).toBeGreaterThan(0);
    }
  });
});
