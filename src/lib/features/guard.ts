import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { canAccessPath, featureIdForPath } from "@/lib/features/access";
import {
  buildFeatureAccessMap,
  checkFeatureAccess,
  checkPathFeatureAccess,
  getActiveMonetizationFlags,
  requireMonetizationFeature,
} from "@/lib/features/feature-access.server";
import type { FeatureId } from "@/lib/features/config";
import type { UserRole } from "@/types/database";

export { requireMonetizationFeature };

export async function requireFeatureAccess(featureId: FeatureId, fallback = "/discover") {
  const profile = await getProfile();
  const role = (profile?.role as UserRole | undefined) ?? null;
  const allowed = await checkFeatureAccess(featureId, { role, userId: profile?.id });
  if (!allowed) redirect(fallback);
  return profile;
}

export async function requirePathFeatureAccess(pathname: string, fallback = "/discover") {
  const profile = await getProfile();
  const role = (profile?.role as UserRole | undefined) ?? null;
  const allowed = await checkPathFeatureAccess(pathname, { role, userId: profile?.id });
  if (!allowed) redirect(fallback);
  return profile;
}

export async function getViewerFeatureAccess() {
  const profile = await getProfile();
  const role = (profile?.role as UserRole | undefined) ?? null;
  const ctx = { role, userId: profile?.id };
  const [featureMap, monetizationFlags] = await Promise.all([
    buildFeatureAccessMap(ctx),
    getActiveMonetizationFlags(ctx),
  ]);

  return {
    role,
    monetizationFlags,
    canAccess: (featureId: FeatureId) => featureMap[featureId] ?? false,
    canAccessPath: (pathname: string) => {
      const pageFeature = featureIdForPath(pathname);
      if (pageFeature && !featureMap[pageFeature]) return false;
      return canAccessPath(pathname, role);
    },
    featureForPath: (pathname: string) => featureIdForPath(pathname),
    isMonetizationFeatureEnabled: (flagKey: string) => monetizationFlags[flagKey] ?? false,
  };
}
