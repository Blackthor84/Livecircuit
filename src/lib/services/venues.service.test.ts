import { describe, expect, it } from "vitest";
import { defaultVenueRoomLabel } from "@/lib/services/venues.service";

describe("defaultVenueRoomLabel", () => {
  it("builds a stable room path from tour context", () => {
    const label = defaultVenueRoomLabel({
      artistSlug: "nova-echo",
      tourSlug: "summer-circuit",
      stopOrder: 2,
      virtualLocationLabel: "Boston, MA",
    });
    expect(label).toContain("nova-echo");
    expect(label).toContain("Boston");
  });
});
