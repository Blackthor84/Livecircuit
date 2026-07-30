import { describe, expect, it } from "vitest";
import { FAN_SCENARIOS, ARTIST_SCENARIOS, PRODUCTION_BULK_CONFIRM_THRESHOLD } from "@/lib/testing/constants";
import { scenarioFanFollowCount, scenarioFollowerCount } from "@/lib/testing/fake-data";

describe("testing constants", () => {
  it("defines fan and artist scenarios", () => {
    expect(FAN_SCENARIOS.length).toBeGreaterThan(0);
    expect(ARTIST_SCENARIOS.length).toBeGreaterThan(0);
  });

  it("scales headliner followers", () => {
    expect(scenarioFollowerCount("headliner")).toBe(100000);
    expect(scenarioFanFollowCount("super_fan")).toBe(100);
  });

  it("requires production confirmation for large bulk", () => {
    expect(PRODUCTION_BULK_CONFIRM_THRESHOLD).toBe(100);
  });
});
