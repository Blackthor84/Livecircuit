import { describe, expect, it } from "vitest";
import { evaluateTouringAccess } from "@/lib/virtual-touring/access";
import { parseTourLocationInput, profileMatchesStop } from "@/lib/virtual-touring/location";

describe("parseTourLocationInput", () => {
  it("parses city and state", () => {
    expect(parseTourLocationInput("Boston, MA")).toEqual({
      tourCity: "Boston",
      tourStateCode: "MA",
      tourStateName: "Massachusetts",
    });
  });
});

describe("profileMatchesStop", () => {
  it("matches by city", () => {
    expect(
      profileMatchesStop(
        { cityName: "Boston", stateCode: "MA" },
        { tourCity: "Boston", tourStateCode: "MA", tourStateName: "Massachusetts" }
      )
    ).toBe(true);
  });

  it("matches by state when cities differ", () => {
    expect(
      profileMatchesStop(
        { cityName: "Cambridge", stateCode: "MA" },
        { tourCity: "Boston", tourStateCode: "MA", tourStateName: "Massachusetts" }
      )
    ).toBe(true);
  });
});

describe("evaluateTouringAccess", () => {
  const stop = {
    tourCity: "Boston",
    tourStateCode: "MA",
    tourStateName: "Massachusetts",
    audienceMode: "local_only" as const,
    localPriorityMinutes: 30,
    doorsOpenAt: new Date().toISOString(),
    showStartsAt: new Date(Date.now() + 3600000).toISOString(),
  };

  it("denies non-local fans for local_only", () => {
    const result = evaluateTouringAccess({
      ...stop,
      profile: { cityName: "Los Angeles", stateCode: "CA" },
      hasTicket: true,
      isVip: false,
      isSubscriber: false,
      isInvited: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.denialMessage).toContain("Boston");
  });

  it("allows local fans for local_only", () => {
    const result = evaluateTouringAccess({
      ...stop,
      profile: { cityName: "Boston", stateCode: "MA" },
      hasTicket: true,
      isVip: false,
      isSubscriber: false,
      isInvited: false,
    });
    expect(result.allowed).toBe(true);
    expect(result.isHomeCrowd).toBe(true);
  });
});
