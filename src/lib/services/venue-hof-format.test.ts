import { describe, expect, it } from "vitest";
import { formatHofMetric } from "@/lib/services/venue-hof-format";

describe("formatHofMetric", () => {
  it("formats revenue cents", () => {
    expect(formatHofMetric(125000, "revenue")).toBe("$1,250");
  });

  it("formats integers", () => {
    expect(formatHofMetric(4200, "tickets")).toBe("4,200");
  });
});
