import "server-only";

import type { MonetizationFeatureFlag, MonetizationSnapshot } from "@/lib/monetization/types";

export type FeatureFlagCheckContext = {
  userId?: string;
  userRole?: string;
  region?: string;
  isBetaUser?: boolean;
};

export function isFeatureFlagActive(
  flag: MonetizationFeatureFlag,
  ctx: FeatureFlagCheckContext = {}
): boolean {
  if (!flag.isEnabled) return false;

  const now = new Date();
  if (flag.startsAt && now < new Date(flag.startsAt)) return false;
  if (flag.endsAt && now > new Date(flag.endsAt)) return false;

  if (flag.visibility === "disabled" || flag.visibility === "hidden") return false;
  if (flag.visibility === "coming_soon") return false;
  if (flag.visibility === "beta_only" && !ctx.isBetaUser) return false;
  if (flag.visibility === "admin_only" && ctx.userRole !== "admin" && ctx.userRole !== "super_admin") return false;
  if (flag.visibility === "agency_only" && ctx.userRole !== "agency") return false;

  if (flag.rolloutRegions.length && ctx.region && !flag.rolloutRegions.includes(ctx.region)) {
    return false;
  }

  if (flag.rolloutRoles.length && ctx.userRole && !flag.rolloutRoles.includes(ctx.userRole)) {
    return false;
  }

  if (flag.rolloutPercent < 100 && ctx.userId) {
    const hash = ctx.userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    if (hash % 100 >= flag.rolloutPercent) return false;
  }

  return true;
}

export function getActiveFeatureFlags(
  snapshot: MonetizationSnapshot,
  ctx: FeatureFlagCheckContext = {}
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const flag of snapshot.featureFlags) {
    out[flag.flagKey] = isFeatureFlagActive(flag, ctx);
  }
  return out;
}

export function isFeatureEnabled(
  snapshot: MonetizationSnapshot,
  flagKey: string,
  ctx: FeatureFlagCheckContext = {}
): boolean {
  const flag = snapshot.featureFlags.find((f) => f.flagKey === flagKey);
  if (!flag) return false;
  return isFeatureFlagActive(flag, ctx);
}
