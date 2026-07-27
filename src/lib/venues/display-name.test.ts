import { describe, expect, it } from "vitest";
import { getVenueDisplayName, hasActiveVenueSponsorship, isNamingRightsAvailable } from "@/lib/venues/display-name";
import { buildPlaceholderVenueName, buildPlaceholderVenueSlug, tierForCapacity } from "@/lib/venues/placeholder-names";

describe("getVenueDisplayName", () => {
  it("prefers sponsored_name over default_name", () => {
    expect(
      getVenueDisplayName({
        default_name: "New Hampshire Community Arena",
        display_name: "New Hampshire Community Arena",
        sponsored_name: "Acme Community Arena",
      })
    ).toBe("Acme Community Arena");
  });

  it("falls back to default_name when no sponsor", () => {
    expect(
      getVenueDisplayName({
        default_name: "Boston Grand Arena",
        display_name: "Boston Grand Arena",
        sponsored_name: null,
      })
    ).toBe("Boston Grand Arena");
  });
});

describe("hasActiveVenueSponsorship", () => {
  it("returns false for placeholder venues", () => {
    expect(
      hasActiveVenueSponsorship({
        default_name: "Boston Community Arena",
        display_name: "Boston Community Arena",
        sponsorship_status: "available",
      })
    ).toBe(false);
  });

  it("returns true for active sponsored venues", () => {
    expect(
      hasActiveVenueSponsorship({
        default_name: "Boston Community Arena",
        display_name: "Acme Community Arena",
        sponsored_name: "Acme Community Arena",
        sponsorship_status: "active",
      })
    ).toBe(true);
  });
});

describe("isNamingRightsAvailable", () => {
  it("is true when no active sponsor", () => {
    expect(
      isNamingRightsAvailable({
        default_name: "Boston Community Arena",
        display_name: "Boston Community Arena",
        sponsorship_status: "available",
      })
    ).toBe(true);
  });
});

describe("placeholder name helpers", () => {
  it("builds region tier arena names", () => {
    expect(buildPlaceholderVenueName("New Hampshire", "Community")).toBe("New Hampshire Community Arena");
    expect(buildPlaceholderVenueName("Boston", "Stadium")).toBe("Boston Stadium Arena");
  });

  it("builds stable slugs", () => {
    expect(buildPlaceholderVenueSlug("New Hampshire", "Community")).toBe("new-hampshire-community-arena");
  });

  it("maps capacity to tier", () => {
    expect(tierForCapacity(50000)).toBe("Stadium");
    expect(tierForCapacity(25000)).toBe("Grand");
    expect(tierForCapacity(12000)).toBe("Community");
  });
});
