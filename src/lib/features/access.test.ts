import { describe, expect, it } from "vitest";
import { canAccessFeature, canAccessPath, isSuperAdmin } from "@/lib/features/access";
import { isFeaturePubliclyEnabled } from "@/lib/features/config";

describe("feature gates", () => {
  it("hides MVP features from fans by default", () => {
    expect(isFeaturePubliclyEnabled("world_map")).toBe(false);
    expect(canAccessFeature("world_map", "fan")).toBe(false);
    expect(canAccessPath("/world", "fan")).toBe(false);
  });

  it("allows super_admin preview access", () => {
    expect(canAccessFeature("friend_system", "super_admin")).toBe(true);
    expect(canAccessPath("/friends", "super_admin")).toBe(true);
  });

  it("does not grant preview access to admin role alone", () => {
    expect(isSuperAdmin("admin")).toBe(false);
    expect(canAccessPath("/marketplace", "admin")).toBe(false);
  });

  it("keeps public routes open", () => {
    expect(canAccessPath("/discover", "fan")).toBe(true);
    expect(canAccessPath("/artists", null)).toBe(true);
  });
});
