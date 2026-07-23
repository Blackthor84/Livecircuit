import { describe, expect, it } from "vitest";
import { averageRatingFromRows, slugifyCreatorHandle } from "@/lib/services/marketplace-slug";

describe("slugifyCreatorHandle", () => {
  it("builds stable slug from name", () => {
    const id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    expect(slugifyCreatorHandle("Alex Rivera", id)).toBe("alex-rivera-aaaaaa");
  });
});

describe("averageRatingFromRows", () => {
  it("computes mean", () => {
    expect(averageRatingFromRows([5, 4, 4])).toBe(4.33);
  });
});
