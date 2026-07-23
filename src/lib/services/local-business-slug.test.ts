import { describe, expect, it } from "vitest";
import { slugifyLocalBusiness } from "@/lib/services/local-business-slug";

describe("slugifyLocalBusiness", () => {
  it("creates URL-safe slug", () => {
    const id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    expect(slugifyLocalBusiness("Joe's Coffee", id)).toBe("joe-s-coffee-aaaaaa");
  });
});
