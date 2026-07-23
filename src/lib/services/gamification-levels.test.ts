import { describe, expect, it } from "vitest";
import {
  isoWeekKey,
  levelFromTotalXp,
  periodKeyForCadence,
  prestigeFromLevel,
  xpProgressInLevel,
} from "@/lib/services/gamification-levels";

describe("gamification levels", () => {
  it("computes level from xp", () => {
    expect(levelFromTotalXp(0)).toBe(1);
    expect(levelFromTotalXp(200)).toBeGreaterThan(1);
  });

  it("computes prestige from level", () => {
    expect(prestigeFromLevel(16)).toBe(1);
  });

  it("progress within level", () => {
    const p = xpProgressInLevel(75, 2);
    expect(p.percent).toBeGreaterThanOrEqual(0);
    expect(p.percent).toBeLessThanOrEqual(100);
  });

  it("period keys", () => {
    expect(periodKeyForCadence("daily")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(isoWeekKey(new Date("2026-07-01T12:00:00Z"))).toContain("-W");
  });
});
