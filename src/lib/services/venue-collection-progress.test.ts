import { describe, expect, it } from "vitest";
import { computeCompletionPercent } from "@/lib/services/venue-collection-progress";

describe("venue collection progress", () => {
  it("caps completion at 100", () => {
    expect(computeCompletionPercent(20, 10)).toBe(100);
  });

  it("rounds partial completion", () => {
    expect(computeCompletionPercent(1, 3)).toBe(33);
  });
});
