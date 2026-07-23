import { describe, expect, it } from "vitest";
import { approximateLocalTime, filterMarkersByCategory, zoomLevelFromMapZoom } from "@/lib/services/world-zoom";

describe("world zoom", () => {
  it("maps zoom to level", () => {
    expect(zoomLevelFromMapZoom(1)).toBe("earth");
    expect(zoomLevelFromMapZoom(5)).toBe("state");
    expect(zoomLevelFromMapZoom(10)).toBe("venue");
  });

  it("filters markers", () => {
    const markers = [
      { name: "A", isLive: true, categories: ["music"], cityName: "Boston" },
      { name: "B", isLive: false, categories: ["comedy"], cityName: "NYC" },
    ];
    expect(filterMarkersByCategory(markers, "live", "").length).toBe(1);
    expect(filterMarkersByCategory(markers, "all", "bos").length).toBe(1);
  });
});
