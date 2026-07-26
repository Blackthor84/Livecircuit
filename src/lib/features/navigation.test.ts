import { describe, expect, it } from "vitest";
import {
  formatRoleBadge,
  getAccountMenuLinks,
  getAccountMenuSections,
} from "@/lib/features/account-menu";
import {
  getAuthenticatedNav,
  getGuestAuthCTAs,
  getPublicNav,
} from "@/lib/features/navigation";
import { ADMIN_SECTIONS } from "@/lib/admin/sections";

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

  it("shows guest auth CTAs", () => {
    expect(getGuestAuthCTAs().map((i) => i.label)).toEqual([
      "Get Started",
      "Create Account",
      "Sign In",
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
});

describe("account menu phase 1", () => {
  it("includes core links for all users", () => {
    const labels = getAccountMenuLinks({ role: "fan" }).map((i) => i.label);
    expect(labels).toEqual(["Profile", "Settings", "Notifications"]);
  });

  it("adds artist dashboard for artists", () => {
    expect(getAccountMenuLinks({ role: "artist" }).map((i) => i.label)).toContain(
      "Artist Dashboard"
    );
  });

  it("adds admin dashboard for admin", () => {
    expect(getAccountMenuLinks({ role: "admin" }).map((i) => i.label)).toContain("Admin Dashboard");
  });

  it("adds command center for super_admin", () => {
    expect(getAccountMenuLinks({ role: "super_admin" }).map((i) => i.label)).toContain(
      "Command Center"
    );
  });

  it("formats role badges", () => {
    expect(formatRoleBadge("super_admin")).toBe("SUPER ADMIN");
  });
});

describe("command center sidebar", () => {
  it("includes phase 1 sections", () => {
    expect(ADMIN_SECTIONS.map((s) => s.label)).toEqual([
      "Overview",
      "Live Now",
      "Users",
      "Artists",
      "Events",
      "Venues",
      "Tours",
      "Genres",
      "Analytics",
      "Moderation",
      "Observer Accounts",
      "Feature Flags",
      "Platform Settings",
      "System Health",
    ]);
  });
});
