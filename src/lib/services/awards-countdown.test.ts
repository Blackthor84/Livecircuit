import { describe, expect, it } from "vitest";
import {
  canCastAwardVote,
  countdownParts,
  resolveAwardsCountdown,
} from "@/lib/services/awards-countdown";

describe("awards countdown", () => {
  const now = new Date("2026-07-01T12:00:00Z");

  it("shows voting countdown during voting window", () => {
    const result = resolveAwardsCountdown(
      "voting",
      "2026-12-01T23:59:59Z",
      "2026-12-15T20:00:00Z",
      now
    );
    expect(result?.target).toBe("voting");
  });

  it("computes countdown parts", () => {
    const parts = countdownParts("2026-07-02T12:00:00Z", now);
    expect(parts.days).toBe(1);
    expect(parts.hours).toBe(0);
  });

  it("allows votes only in voting phase before deadline", () => {
    expect(canCastAwardVote("voting", "2026-12-01T23:59:59Z", now)).toBe(true);
    expect(canCastAwardVote("archived", "2026-12-01T23:59:59Z", now)).toBe(false);
  });
});
