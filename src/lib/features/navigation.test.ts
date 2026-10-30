import { describe, expect, it } from "vitest";
import {
  formatRoleBadge,
  getAccountMenuLinks,
  getAccountMenuSections,
} from "@/lib/features/account-menu";
import {
  getAuthenticatedNav,
  getArtistNav,
  getBusinessNav,
  getGuestAuthCTAs,
  getPublicNav,
  isNavItemActive,
} from "@/lib/features/navigation";
import { ADMIN_SECTIONS } from "@/lib/admin/sections";

describe("navigation", () => {
  it("shows public nav when logged out", () => {
    const nav = getPublicNav();
    expect(nav.map((i) => i.label)).toEqual([
      "Home",
      "Interactive Demo",
      "Tours",
      "Discover",
      "Artists",
      "Passport",
      "Venues",
      "About",
      "Creator Promise",
    ]);
    expect(nav.find((i) => i.label === "Interactive Demo")?.featured).toBe(true);
    expect(nav.find((i) => i.label === "Creator Promise")?.href).toBe("/creator-promise");
  });

  it("shows guest auth CTAs", () => {
    expect(getGuestAuthCTAs().map((i) => i.label)).toEqual([
      "Get Started",
      "Create Account",
      "Sign In",
    ]);
  });

  it("shows authenticated main nav", () => {
    const nav = getAuthenticatedNav({ role: "fan" });
    expect(nav.map((i) => i.label)).toEqual([
      "Home",
      "Interactive Demo",
      "Discover",
      "Events",
      "Following",
      "Notifications",
    ]);
    expect(nav.find((i) => i.label === "Events")?.href).toBe("/dashboard");
  });

  it("shows artist nav with success center", () => {
    expect(getArtistNav().map((i) => i.label)).toEqual(["Artist Success Center"]);
    expect(getArtistNav()[0]?.href).toBe("/artists/success-center");
    expect(getArtistNav()[0]?.badge).toBe("NEW");
  });

  it("shows business nav with sponsor visualizer", () => {
    expect(getBusinessNav().map((i) => i.label)).toEqual(["Sponsor Visualizer"]);
    expect(getBusinessNav()[0]?.href).toBe("/demo/naming-rights");
    expect(getBusinessNav()[0]?.badge).toBe("New");
  });

  it("detects active nav items", () => {
    expect(isNavItemActive("/demo/naming-rights", "/demo/naming-rights")).toBe(true);
    expect(isNavItemActive("/discover", "/demo/naming-rights")).toBe(false);
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
  it("includes command center sections with monetization and testing", () => {
    const labels = ADMIN_SECTIONS.map((s) => s.label);
    expect(labels).toEqual([
      "Overview",
      "Live Now",
      "Users",
      "Artists",
      "Agencies",
      "Events",
      "Venue Management",
      "Global Regions",
      "Sponsorships",
      "Founding Partners",
      "Revenue",
      "Monetization Center",
      "Business Rules",
      "Feature Flags",
      "Tours",
      "Genres",
      "Analytics",
      "Moderation",
      "Observer Accounts",
      "Testing Center",
      "Platform Settings",
      "System Health",
    ]);
    expect(ADMIN_SECTIONS.some((s) => s.href === "/admin/monetization")).toBe(true);
    expect(ADMIN_SECTIONS.some((s) => s.href === "/admin/testing")).toBe(true);
  });
});
