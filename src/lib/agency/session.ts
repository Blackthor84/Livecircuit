import { getAgencyPermissions } from "@/lib/agency/permissions";
import type { AgencyMemberRole, AgencyPermissions } from "@/lib/agency/types";
import { getProfile, getSessionUser } from "@/lib/auth/session";
import {
  getUserAgencyOrganizations,
  resolveAgencyOrgAccess,
} from "@/lib/data/agencies";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { syncAgencyAccountProfile } from "@/lib/auth/agency-account";

export type AgencySessionFailureCode =
  | "not_authenticated"
  | "not_agency_account"
  | "no_organization"
  | "no_membership"
  | "organization_not_found"
  | "not_configured";

export type AgencySession = {
  userId: string;
  orgId: string;
  memberRole: AgencyMemberRole;
  organization: Record<string, unknown>;
  permissions: AgencyPermissions;
  subscription: {
    plan: string;
    planStartedAt: string | null;
    planRenewsAt: string | null;
    stripeSubscriptionId: string | null;
  };
};

export type AgencySessionResult =
  | { ok: true; session: AgencySession }
  | { ok: false; code: AgencySessionFailureCode; message: string };

export async function resolveAgencySession(userId: string): Promise<AgencySessionResult> {
  const profile = await getProfile();
  if (!profile || profile.id !== userId) {
    return { ok: false, code: "not_authenticated", message: "Sign in to access the agency portal." };
  }

  if (profile.role !== "agency") {
    return {
      ok: false,
      code: "not_agency_account",
      message: "This account is not an agency user.",
    };
  }

  let orgId = (profile.primary_agency_id as string | null) ?? null;

  if (!orgId) {
    const orgs = await getUserAgencyOrganizations(userId);
    orgId = orgs[0]?.id ?? null;
    if (orgId && orgs[0]) {
      const admin = getSupabaseAdmin();
      await syncAgencyAccountProfile(admin, {
        userId,
        organizationId: orgId,
        memberRole: orgs[0].role,
      });
    }
  }

  if (!orgId) {
    return {
      ok: false,
      code: "no_organization",
      message: "No agency organization is linked to this account.",
    };
  }

  const access = await resolveAgencyOrgAccess(orgId, userId);
  if (!access.ok) {
    return {
      ok: false,
      code:
        access.code === "no_membership"
          ? "no_membership"
          : access.code === "organization_not_found"
            ? "organization_not_found"
            : "not_configured",
      message: access.message,
    };
  }

  const org = access.organization;
  const permissions = getAgencyPermissions(access.role);

  return {
    ok: true,
    session: {
      userId,
      orgId,
      memberRole: access.role,
      organization: org,
      permissions,
      subscription: {
        plan: (org.plan as string) ?? "starter",
        planStartedAt: (org.plan_started_at as string | null) ?? null,
        planRenewsAt: (org.plan_renews_at as string | null) ?? null,
        stripeSubscriptionId: (org.stripe_subscription_id as string | null) ?? null,
      },
    },
  };
}

export async function loadAgencySessionForUser(userId: string): Promise<AgencySessionResult> {
  console.info("[Agency Session] Loading agency session", { userId });
  const result = await resolveAgencySession(userId);
  if (result.ok) {
    console.info("[Agency Session] Agency session loaded", {
      userId,
      orgId: result.session.orgId,
      memberRole: result.session.memberRole,
      plan: result.session.subscription.plan,
    });
  } else {
    console.warn("[Agency Session] Agency session failed", {
      userId,
      code: result.code,
      message: result.message,
    });
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
