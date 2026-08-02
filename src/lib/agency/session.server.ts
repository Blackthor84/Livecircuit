import "server-only";

import { syncAgencyAccountProfile } from "@/lib/auth/agency-account";
import { countAgencyOrgRows } from "@/lib/agency/agency-data.server";
import { runAgencyMembershipDiagnostic } from "@/lib/agency/membership-diagnostic.server";
import {
  listAgencyMembershipsForUser,
  resolveAgencyMembershipForUser,
  touchAgencyMembershipActivity,
} from "@/lib/agency/membership.server";
import { ensureAgencyOrganizationComplete } from "@/lib/agency/organization-health.server";
import type { AgencySession, AgencySessionResult } from "@/lib/agency/membership.types";
import { getAgencyOrgTemplate, type AgencyScenarioSlug } from "@/lib/agency";
import { getProfile, getSessionUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type {
  AgencySession,
  AgencySessionFailureCode,
  AgencySessionResult,
} from "@/lib/agency/membership.types";

function logSession(step: string, data?: Record<string, unknown>) {
  console.info(`[Agency Session] ${step}`, data ?? {});
}

export async function resolveAgencySession(userId: string): Promise<AgencySessionResult> {
  logSession("Loading authenticated user", { userId });

  const user = await getSessionUser();
  if (!user || user.id !== userId) {
    return {
      ok: false,
      code: "not_authenticated",
      message: "Sign in to access the agency portal.",
      details: { userId },
    };
  }

  const profile = await getProfile();
  if (profile?.role !== "agency") {
    return {
      ok: false,
      code: "not_agency_account",
      message: "This account is not an agency user.",
      details: { userId, role: profile?.role ?? null },
    };
  }

  const preferredOrgId = (profile.primary_agency_id as string | null) ?? null;
  logSession("Resolving membership (membership-first)", { userId, preferredOrgId });

  const resolved = await resolveAgencyMembershipForUser(userId, preferredOrgId);
  if (!resolved.ok) {
    return {
      ok: false,
      code:
        resolved.code === "no_membership"
          ? "no_membership"
          : resolved.code === "organization_not_found"
            ? "organization_not_found"
            : "not_configured",
      message: resolved.message,
      details: resolved.details,
    };
  }

  const { membership, organization, permissions } = resolved;

  if (!membership.role || Object.keys(permissions).length === 0) {
    return {
      ok: false,
      code: "permissions_missing",
      message: "Agency permissions could not be resolved for your membership role.",
      details: {
        userId,
        membershipId: membership.id,
        role: membership.role,
        table: "agency_organization_members",
      },
    };
  }

  if (!organization.plan) {
    return {
      ok: false,
      code: "subscription_missing",
      message: "Agency subscription is missing. The organization has no active plan.",
      details: {
        userId,
        organizationId: membership.organization_id,
        table: "agency_organizations",
      },
    };
  }

  if (preferredOrgId !== membership.organization_id) {
    logSession("Syncing profile primary_agency_id from membership", {
      userId,
      from: preferredOrgId,
      to: membership.organization_id,
    });
    const admin = getSupabaseAdmin();
    await syncAgencyAccountProfile(admin, {
      userId,
      organizationId: membership.organization_id,
      memberRole: membership.role,
    });
  }

  logSession("Loading subscription", {
    organizationId: membership.organization_id,
    plan: organization.plan,
    stripeSubscriptionId: organization.stripe_subscription_id ?? null,
  });

  void touchAgencyMembershipActivity(membership.id);

  return {
    ok: true,
    session: {
      userId,
      orgId: membership.organization_id,
      membershipId: membership.id,
      memberRole: membership.role,
      organization,
      permissions,
      subscription: {
        plan: (organization.plan as string) ?? "boutique",
        planStartedAt: (organization.plan_started_at as string | null) ?? null,
        planRenewsAt: (organization.plan_renews_at as string | null) ?? null,
        stripeSubscriptionId: (organization.stripe_subscription_id as string | null) ?? null,
      },
    },
  };
}

async function ensureTestAgencySeedData(userId: string, session: AgencySession) {
  const admin = getSupabaseAdmin();
  const profile = await getProfile();
  if (!profile?.is_test_account) return;

  const orgMetadata = (session.organization.metadata ?? {}) as Record<string, unknown>;
  const scenario = (orgMetadata.scenario as AgencyScenarioSlug | undefined) ?? "boutique_agency";
  const template = getAgencyOrgTemplate(scenario);
  const counts = await countAgencyOrgRows(admin, session.orgId);

  const needsSeed =
    counts.roster < template.artistCount ||
    counts.bookings < Math.min(template.bookingCount, 10) ||
    counts.calendar < 12;

  if (!needsSeed) return;

  logSession("Test org missing seed data — auto-repairing", {
    userId,
    orgId: session.orgId,
    scenario,
    counts,
    targets: { artists: template.artistCount, bookings: template.bookingCount },
  });

  await ensureAgencyOrganizationComplete(admin, {
    userId,
    organizationId: session.orgId,
    memberRole: session.memberRole,
    scenario,
    createdBy: userId,
    generationMode: "repair",
  });
}

export async function loadAgencySessionForUser(userId: string): Promise<AgencySessionResult> {
  const result = await resolveAgencySession(userId);
  if (result.ok) {
    await ensureTestAgencySeedData(userId, result.session);
    logSession("Dashboard session ready", {
      userId,
      orgId: result.session.orgId,
      membershipId: result.session.membershipId,
      memberRole: result.session.memberRole,
      plan: result.session.subscription.plan,
    });
  } else {
    logSession("Dashboard session failed", {
      userId,
      code: result.code,
      message: result.message,
      details: result.details,
    });
    await runAgencyMembershipDiagnostic(userId);
  }
  return result;
}

export async function getAgencySessionOrgId(userId: string): Promise<string | null> {
  const result = await resolveAgencySession(userId);
  return result.ok ? result.session.orgId : null;
}

export async function requireAgencySessionUserId(): Promise<string | null> {
  const user = await getSessionUser();
  return user?.id ?? null;
}

/** Quick membership count for UI hints. */
export async function userHasAgencyMembership(userId: string): Promise<boolean> {
  const memberships = await listAgencyMembershipsForUser(userId);
  return memberships.length > 0;
}
