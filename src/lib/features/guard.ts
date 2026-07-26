import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { canAccessFeature, canAccessPath, featureIdForPath } from "@/lib/features/access";
import type { FeatureId } from "@/lib/features/config";
import type { UserRole } from "@/types/database";

export async function requireFeatureAccess(featureId: FeatureId, fallback = "/discover") {
  const profile = await getProfile();
  const role = (profile?.role as UserRole | undefined) ?? null;
  if (!canAccessFeature(featureId, role)) redirect(fallback);
  return profile;
}

export async function requirePathFeatureAccess(pathname: string, fallback = "/discover") {
  const profile = await getProfile();
  const role = (profile?.role as UserRole | undefined) ?? null;
  if (!canAccessPath(pathname, role)) redirect(fallback);
  return profile;
}

export async function getViewerFeatureAccess() {
  const profile = await getProfile();
  const role = (profile?.role as UserRole | undefined) ?? null;
  return {
    role,
    canAccess: (featureId: FeatureId) => canAccessFeature(featureId, role),
    canAccessPath: (pathname: string) => canAccessPath(pathname, role),
    featureForPath: (pathname: string) => featureIdForPath(pathname),
  };
}
