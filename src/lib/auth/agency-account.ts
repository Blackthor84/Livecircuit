import type { SupabaseClient } from "@supabase/supabase-js";
import { agencyDashboardPath } from "@/lib/agency/sections";
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

  let orgId = target.primary_agency_id;

  if (orgId) {
    const { data: linkedOrg } = await admin
      .from("agency_organizations")
      .select("id, name")
      .eq("id", orgId)
      .maybeSingle();
    if (!linkedOrg) {
      logImpersonation("Primary agency not found", { orgId });
      orgId = null;
    } else {
      logImpersonation("Agency found via primary_agency_id", { orgId, name: linkedOrg.name });
    }
  }

  if (!orgId) {
    const { data: memberships, error: membershipListError } = await admin
      .from("agency_organization_members")
      .select("organization_id, role")
      .eq("user_id", target.id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (membershipListError) {
      return { ok: false, code: "membership_query_failed", error: membershipListError.message };
    }

    const membership = memberships?.[0];
    if (!membership) {
      return {
        ok: false,
        code: "no_membership",
        error: "This test agency has not been fully generated. No organization membership exists for this account.",
      };
    }

    orgId = membership.organization_id as string;
    logImpersonation("Agency resolved from membership", { orgId, role: membership.role });
    await syncAgencyAccountProfile(admin, {
      userId: target.id,
      organizationId: orgId,
      memberRole: (membership.role ?? target.agency_member_role ?? "owner") as AgencyMemberRole,
    });
  }

  const { data: member, error: memberError } = await admin
    .from("agency_organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", target.id)
    .maybeSingle();

  if (memberError) {
    return { ok: false, code: "membership_query_failed", error: memberError.message };
  }

  if (!member) {
    return {
      ok: false,
      code: "permission_mismatch",
      error: "User is not linked to this agency team. Recreate or repair the test agency account.",
    };
  }

  const { data: org, error: orgError } = await admin
    .from("agency_organizations")
    .select("id, name, plan, stripe_subscription_id")
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

  if (target.primary_agency_id !== orgId || target.agency_member_role !== member.role) {
    await syncAgencyAccountProfile(admin, {
      userId: target.id,
      organizationId: orgId,
      memberRole: member.role as AgencyMemberRole,
    });
  }

  logImpersonation("Agency permissions validated", {
    orgId,
    memberRole: member.role,
    plan: org.plan,
  });

  return {
    ok: true,
    orgId,
    orgName: org.name as string,
    redirect: agencyDashboardPath(),
  };
}
