import { describe, expect, it } from "vitest";
import { ADMIN_ROLES, isAdminRole, isArtistOrAdminRole } from "@/lib/auth/roles";

describe("admin roles", () => {
  it("treats super_admin as admin", () => {
    expect(isAdminRole("super_admin")).toBe(true);
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("fan")).toBe(false);
  });

  it("includes super_admin in ADMIN_ROLES", () => {
    expect(ADMIN_ROLES).toContain("super_admin");
    expect(ADMIN_ROLES).toContain("admin");
  });

  it("treats super_admin as artist-or-admin for artist tooling", () => {
    expect(isArtistOrAdminRole("super_admin")).toBe(true);
    expect(isArtistOrAdminRole("artist")).toBe(true);
    expect(isArtistOrAdminRole("fan")).toBe(false);
  });
});
