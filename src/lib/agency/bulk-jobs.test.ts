import { describe, expect, it } from "vitest";
import { computeBulkBookingSteps } from "@/lib/agency/bulk-jobs";

describe("agency bulk booking jobs", () => {
  it("computes steps for artists with auto match", () => {
    const steps = computeBulkBookingSteps({
      title: "Tour",
      artistIds: ["a", "b", "c"],
      runAutoMatch: true,
      bookingMode: "single",
    });
    expect(steps).toBe(6);
  });

  it("increases steps for tour mode", () => {
    const steps = computeBulkBookingSteps({
      title: "Tour",
      artistIds: ["a", "b"],
      runAutoMatch: false,
      bookingMode: "tour",
    });
    expect(steps).toBe(6);
  });
});
