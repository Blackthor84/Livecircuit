import { describe, expect, it } from "vitest";
import type { SeasonRewardTier } from "@/lib/types/seasons";

describe("season rewards progress", () => {
  it("finds next unreached tier", () => {
    const rewards: SeasonRewardTier[] = [
      { tier: "Bronze", points: 100, reward: "Badge" },
      { tier: "Gold", points: 500, reward: "Frame" },
    ];
    const points = 120;
    const next = rewards.find((r) => points < r.points);
    expect(next?.tier).toBe("Gold");
  });
});
