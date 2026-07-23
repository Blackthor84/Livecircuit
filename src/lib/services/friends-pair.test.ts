import { describe, expect, it } from "vitest";
import { canonicalFriendPair, inviteCodeFromPartyId } from "@/lib/services/friends-pair";

describe("canonicalFriendPair", () => {
  it("orders UUIDs lexicographically", () => {
    const a = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const b = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    expect(canonicalFriendPair(a, b)).toEqual({ userLow: a, userHigh: b });
    expect(canonicalFriendPair(b, a)).toEqual({ userLow: a, userHigh: b });
  });
});

describe("inviteCodeFromPartyId", () => {
  it("derives short uppercase code", () => {
    const id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    expect(inviteCodeFromPartyId(id)).toBe("A1B2C3D4");
  });
});
