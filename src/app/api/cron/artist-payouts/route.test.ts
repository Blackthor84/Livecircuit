import { describe, expect, it } from "vitest";
import { verifyCronRequest, isCronSecretConfigured } from "@/lib/auth/cron";

describe("artist payout cron auth", () => {
  it("TEST 19: unauthenticated cron request rejected when secret configured", () => {
    const original = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "test-cron-secret-value-1234";
    try {
      expect(isCronSecretConfigured()).toBe(true);
      expect(verifyCronRequest(new Request("http://localhost/api/cron/artist-payouts"))).toBe(false);
      expect(
        verifyCronRequest(
          new Request("http://localhost/api/cron/artist-payouts", {
            headers: { Authorization: "Bearer test-cron-secret-value-1234" },
          }),
        ),
      ).toBe(true);
    } finally {
      process.env.CRON_SECRET = original;
    }
  });
});
