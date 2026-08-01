import type { SupabaseClient } from "@supabase/supabase-js";
import { agencyDashboardPath } from "@/lib/agency/sections";
import { getAgencyPermissions } from "@/lib/agency/permissions";
import { listAgencyMembershipsForUserAdmin } from "@/lib/agency/membership";
import type { AgencyScenarioSlug } from "@/lib/agency/org-templates";
import { ensureAgencyDashboardSettings } from "@/lib/agency/organization-health";
import type { AgencyMemberRole } from "@/lib/agency/types";

export type AgencyAccountProfile = {
  role: "agency";
  primary_agency_id: string;
  agency_member_role: AgencyMemberRole;
};

/** Promote a profile to a first-class agency account (service role / trusted writer). */
export async function syncAgencyAccountProfile(
  admin: SupabaseClient,
  input: {
    userId: string;
    organizationId: string;
    memberRole: AgencyMemberRole;
  }
) {
  const { error } = await admin
    .from("profiles")
    .update({
      role: "agency",
      primary_agency_id: input.organizationId,
      agency_member_role: input.memberRole,
    })
    .eq("id", input.userId);

  if (error) throw error;
}

export function resolveAgencyRedirect(profile: {
  role: string;
  primary_agency_id?: string | null;
}): string | null {
  if (profile.role === "agency") {
    return agencyDashboardPath();
  }
  return null;
}

export function isAgencyAccount(profile: { role: string } | null | undefined): boolean {
  return profile?.role === "agency";
}

export type AgencyImpersonationValidation =
  | { ok: true; orgId: string; redirect: string; orgName: string }
  | { ok: false; error: string; code?: string };

function logImpersonation(step: string, data?: Record<string, unknown>) {
  console.info(`[Agency Impersonation] ${step}`, data ?? {});
}

/** Verify test agency impersonation targets before navigation (service role). */
export async function validateAgencyImpersonationTarget(
  admin: SupabaseClient,
  target: {
    id: string;
    role: string;
    primary_agency_id: string | null;
    agency_member_role: string | null;
  }
): Promise<AgencyImpersonationValidation> {
  logImpersonation("Starting agency impersonation validation", { userId: target.id });

  if (target.role !== "agency") {
    return { ok: false, code: "not_agency", error: "Target account is not an agency user." };
  }

  const memberships = await listAgencyMembershipsForUserAdmin(admin, target.id);
  logImpersonation("Membership rows loaded", {
    userId: target.id,
    count: memberships.length,
    table: "agency_organization_members",
  });

  if (!memberships.length) {
    return {
      ok: false,
      code: "no_membership",
      error: "User is not linked to an agency. Missing agency_organization_members row.",
    };
  }

  const active =
    (target.primary_agency_id
      ? memberships.find((m) => m.organization_id === target.primary_agency_id)
      : null) ?? memberships[0]!;

  const orgId = active.organization_id;
  const memberRole = active.role;

  logImpersonation("Membership resolved", {
    userId: target.id,
    membershipId: active.id,
    organizationId: orgId,
    role: memberRole,
  });

  const { data: org, error: orgError } = await admin
    .from("agency_organizations")
    .select("id, name, plan, stripe_subscription_id, metadata")
    .eq("id", orgId)
    .maybeSingle();

  if (orgError) {
    return { ok: false, code: "org_query_failed", error: orgError.message };
  }

  if (!org) {
    return {
      ok: false,
      code: "agency_not_found",
      error: "Agency not found. The organization record is missing from the database.",
    };
  }

  if (!org.plan) {
    return { ok: false, code: "subscription_missing", error: "Agency subscription plan is missing." };
  }

  const permissions = getAgencyPermissions(memberRole);
  if (!Object.keys(permissions).length) {
    return { ok: false, code: "permissions_missing", error: "Agency permissions could not be resolved for role." };
  }

  const metadata = (org as { metadata?: Record<string, unknown> }).metadata ?? {};
  if (!metadata.dashboard_settings) {
    const scenario = (metadata.scenario as AgencyScenarioSlug | undefined) ?? "boutique_agency";
    await ensureAgencyDashboardSettings(admin, orgId, scenario);
    logImpersonation("Dashboard settings patched", { orgId, scenario });
  }

  if (target.primary_agency_id !== orgId || target.agency_member_role !== memberRole) {
    await syncAgencyAccountProfile(admin, {
      userId: target.id,
      organizationId: orgId,
      memberRole: memberRole!,
    });
  }

  logImpersonation("Agency permissions validated", {
    orgId,
    memberRole,
    plan: org.plan,
  });

  return {
    ok: true,
    orgId,
    orgName: org.name as string,
    redirect: agencyDashboardPath(),
  };
}
