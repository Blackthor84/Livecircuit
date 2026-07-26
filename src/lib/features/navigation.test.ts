import { describe, expect, it } from "vitest";
import {
  getAuthenticatedNav,
  getPublicNav,
  getUserMenuItems,
} from "@/lib/features/navigation";

describe("navigation", () => {
  it("shows public nav when logged out", () => {
    expect(getPublicNav().map((i) => i.label)).toEqual([
      "Home",
      "Discover",
      "Artists",
      "Venues",
      "About",
    ]);
  });

  it("shows authenticated main nav", () => {
    expect(getAuthenticatedNav({ role: "fan" }).map((i) => i.label)).toEqual([
      "Home",
      "Discover",
      "Events",
      "Following",
      "Notifications",
    ]);
  });

  it("adds role-specific profile menu items", () => {
    expect(getUserMenuItems({ role: "fan" }).map((i) => i.label)).toEqual([
      "My Profile",
      "Settings",
    ]);

    expect(getUserMenuItems({ role: "artist" }).map((i) => i.label)).toEqual([
      "My Profile",
      "Settings",
      "Artist Dashboard",
      "Create Event",
    ]);

    expect(getUserMenuItems({ role: "admin" }).map((i) => i.label)).toContain("Admin Dashboard");
    expect(getUserMenuItems({ role: "super_admin" }).map((i) => i.label)).toContain(
      "Command Center"
    );
  });
});
