import type { UserRole } from "@/types/database";

/** Roles with full Command Center / platform admin permissions. */
export const ADMIN_ROLES = ["admin", "super_admin"] as const satisfies readonly UserRole[];

export function isAdminRole(role: UserRole | string | null | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

export function isArtistOrAdminRole(role: UserRole | string | null | undefined): boolean {
  return role === "artist" || isAdminRole(role);
}
