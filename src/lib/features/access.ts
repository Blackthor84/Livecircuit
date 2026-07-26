import { isAdminRole } from "@/lib/auth/roles";
import type { UserRole } from "@/types/database";
import {
  FEATURE_GATES,
  type FeatureId,
  isFeaturePubliclyEnabled,
  listGatedApiPrefixes,
  listGatedPathPrefixes,
} from "@/lib/features/config";

/** Hidden-feature preview access for MVP gates. */
export function isSuperAdmin(role: UserRole | null | undefined): boolean {
  return role === "super_admin";
}

/** Command Center access (separate from feature preview). */
export function isCommandCenterAdmin(role: UserRole | null | undefined): boolean {
  return isAdminRole(role);
}

export function canAccessFeature(featureId: FeatureId, role: UserRole | null | undefined): boolean {
  if (isFeaturePubliclyEnabled(featureId)) return true;
  return isSuperAdmin(role);
}

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function featureIdForPath(pathname: string): FeatureId | null {
  for (const [id, gate] of Object.entries(FEATURE_GATES) as [FeatureId, (typeof FEATURE_GATES)[FeatureId]][]) {
    if (gate.pathPrefixes.some((prefix) => matchesPrefix(pathname, prefix))) return id;
  }
  return null;
}

export function featureIdForApiPath(pathname: string): FeatureId | null {
  for (const [id, gate] of Object.entries(FEATURE_GATES) as [FeatureId, (typeof FEATURE_GATES)[FeatureId]][]) {
    if (gate.apiPrefixes.some((prefix) => matchesPrefix(pathname, prefix))) return id;
  }
  return null;
}

export function isFeatureGatedPath(pathname: string): boolean {
  return listGatedPathPrefixes().some((prefix) => matchesPrefix(pathname, prefix));
}

export function isFeatureGatedApiPath(pathname: string): boolean {
  return listGatedApiPrefixes().some((prefix) => matchesPrefix(pathname, prefix));
}

export function canAccessPath(pathname: string, role: UserRole | null | undefined): boolean {
  const pageFeature = featureIdForPath(pathname);
  if (pageFeature) return canAccessFeature(pageFeature, role);

  const apiFeature = featureIdForApiPath(pathname);
  if (apiFeature) return canAccessFeature(apiFeature, role);

  return true;
}
