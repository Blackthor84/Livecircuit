import { describe, expect, it } from "vitest";
import { isAchievementEarned, resolveTarget } from "@/lib/services/fan-passport-achievements";
import type { FanPassportAchievementDef, FanPassportProgress } from "@/lib/types/fan-passport";

const baseProgress: FanPassportProgress = {
  stampCount: 5,
  distinctCountries: 2,
  distinctUsStates: 3,
  distinctCities: 2,
  toursCompleted: 1,
  vipStamps: 2,
  comedyStamps: 1,
  specialStamps: 0,
  countryTarget: 10,
  usStateTarget: 50,
  cityTarget: 25,
};

describe("fan passport achievements", () => {
  it("earns first concert at one stamp", () => {
    const def: FanPassportAchievementDef = {
      slug: "first_concert",
      name: "First Concert",
      description: "",
      metric: "stamp_count",
      targetValue: 1,
      sortOrder: 1,
    };
    expect(isAchievementEarned(def, { ...baseProgress, stampCount: 1 }, false)).toBe(true);
  });

  it("uses dynamic country target", () => {
    const def: FanPassportAchievementDef = {
      slug: "all_countries",
      name: "All countries",
      description: "",
      metric: "distinct_countries",
      targetValue: 1,
      sortOrder: 1,
    };
    expect(resolveTarget(def, baseProgress)).toBe(10);
    expect(isAchievementEarned(def, { ...baseProgress, distinctCountries: 10 }, false)).toBe(true);
  });
});
