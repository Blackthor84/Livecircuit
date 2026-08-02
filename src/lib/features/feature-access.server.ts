import "server-only";

import { getProfile } from "@/lib/auth/session";
import { canAccessFeature, canAccessPath, featureIdForPath } from "@/lib/features/access";
import type { FeatureId } from "@/lib/features/config";
import { FEATURE_GATES } from "@/lib/features/config";
import {
  monetizationFlagForFeature,
  monetizationFlagForPath,
} from "@/lib/features/monetization-flags";
import { isFeatureEnabled } from "@/lib/monetization/feature-flags.server";
import { getMonetizationSnapshot } from "@/lib/monetization/pricing-resolver.server";
import type { UserRole } from "@/types/database";

type AccessContext = {
  role: UserRole | null;
  userId?: string;
};

async function loadAccessContext(): Promise<AccessContext> {
  const profile = await getProfile();
  return {
    role: (profile?.role as UserRole | undefined) ?? null,
    userId: profile?.id,
  };
}

export async function checkFeatureAccess(featureId: FeatureId, ctx?: AccessContext): Promise<boolean> {
  const { role, userId } = ctx ?? (await loadAccessContext());
  if (!canAccessFeature(featureId, role)) return false;

  const flagKey = monetizationFlagForFeature(featureId);
  if (!flagKey) return true;

  const snapshot = await getMonetizationSnapshot();
  return isFeatureEnabled(snapshot, flagKey, {
    userRole: role ?? undefined,
    userId,
    isBetaUser: role === "super_admin",
  });
}

export async function checkPathFeatureAccess(pathname: string, ctx?: AccessContext): Promise<boolean> {
  const { role, userId } = ctx ?? (await loadAccessContext());

  const monetizationFlag = monetizationFlagForPath(pathname);
  if (monetizationFlag) {
    const snapshot = await getMonetizationSnapshot();
    if (
      !isFeatureEnabled(snapshot, monetizationFlag, {
        userRole: role ?? undefined,
        userId,
        isBetaUser: role === "super_admin",
      })
    ) {
      return false;
    }
  }

  return canAccessPath(pathname, role);
}

export async function requireMonetizationFeature(flagKey: string, fallback = "/discover") {
  const ctx = await loadAccessContext();
  const snapshot = await getMonetizationSnapshot();
  const enabled = isFeatureEnabled(snapshot, flagKey, {
    userRole: ctx.role ?? undefined,
    userId: ctx.userId,
    isBetaUser: ctx.role === "super_admin",
  });
  if (!enabled) {
    const { redirect } = await import("next/navigation");
    redirect(fallback);
  }
  return ctx;
}

export async function getActiveMonetizationFlags(ctx?: AccessContext): Promise<Record<string, boolean>> {
  const { role, userId } = ctx ?? (await loadAccessContext());
  const snapshot = await getMonetizationSnapshot();
  const out: Record<string, boolean> = {};
  for (const flag of snapshot.featureFlags) {
    out[flag.flagKey] = isFeatureEnabled(snapshot, flag.flagKey, {
      userRole: role ?? undefined,
      userId,
      isBetaUser: role === "super_admin",
    });
  }
  return out;
}

export async function buildFeatureAccessMap(ctx?: AccessContext): Promise<Record<FeatureId, boolean>> {
  const accessCtx = ctx ?? (await loadAccessContext());
  const snapshot = await getMonetizationSnapshot();
  const out = {} as Record<FeatureId, boolean>;

  for (const featureId of Object.keys(FEATURE_GATES) as FeatureId[]) {
    if (!canAccessFeature(featureId, accessCtx.role)) {
      out[featureId] = false;
      continue;
    }
    const flagKey = monetizationFlagForFeature(featureId);
    if (!flagKey) {
      out[featureId] = true;
      continue;
    }
    out[featureId] = isFeatureEnabled(snapshot, flagKey, {
      userRole: accessCtx.role ?? undefined,
      userId: accessCtx.userId,
      isBetaUser: accessCtx.role === "super_admin",
    });
  }
  return out;
}
