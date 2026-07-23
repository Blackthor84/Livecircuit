import { describe, expect, it } from "vitest";
import { referralCodeFromUserId, utcDateKey } from "@/lib/services/coins-rewards";

describe("utcDateKey", () => {
  it("formats UTC date", () => {
    expect(utcDateKey(new Date("2025-07-22T03:00:00.000Z"))).toBe("2025-07-22");
  });
});

describe("referralCodeFromUserId", () => {
  it("derives stable uppercase code", () => {
    const id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    expect(referralCodeFromUserId(id)).toBe("A1B2C3D4E5");
  });
});
