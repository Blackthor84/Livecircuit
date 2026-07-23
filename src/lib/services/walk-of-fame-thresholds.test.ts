import { describe, expect, it } from "vitest";
import {
  communityImpactScore,
  qualifiesForWalkOfFameStar,
  yearsActiveSince,
} from "@/lib/services/walk-of-fame-thresholds";

describe("walk of fame thresholds", () => {
  it("qualifies at threshold", () => {
    expect(qualifiesForWalkOfFameStar("attendance", 500)).toBe(true);
    expect(qualifiesForWalkOfFameStar("attendance", 499)).toBe(false);
  });

  it("computes years active", () => {
    const now = new Date("2026-07-01T00:00:00Z");
    const created = "2024-07-01T00:00:00Z";
    expect(yearsActiveSince(created, now)).toBeCloseTo(2, 1);
  });

  it("aggregates community impact", () => {
    expect(
      communityImpactScore({ chatMessages: 100, reviews: 10, tips: 20, followers: 250 })
    ).toBe(200);
  });
});
