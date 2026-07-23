import { describe, expect, it } from "vitest";
import {
  achievementProgressPercent,
  isAchievementEarned,
  metricValue,
  EMPTY_ACHIEVEMENT_METRICS,
} from "@/lib/services/achievements-metrics";

describe("achievements metrics", () => {
  it("reads metric values", () => {
    expect(metricValue("ticket_count", { ...EMPTY_ACHIEVEMENT_METRICS, ticket_count: 12 })).toBe(12);
  });

  it("computes progress percent capped at 100", () => {
    expect(achievementProgressPercent(5, 10)).toBe(50);
    expect(achievementProgressPercent(20, 10)).toBe(100);
  });

  it("detects earned achievements", () => {
    const metrics = { ...EMPTY_ACHIEVEMENT_METRICS, friend_count: 5 };
    expect(isAchievementEarned("friend_count", 5, metrics)).toBe(true);
    expect(isAchievementEarned("friend_count", 6, metrics)).toBe(false);
  });
});
