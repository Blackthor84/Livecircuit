import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAgencyPermissions } from "@/lib/agency/permissions";
import type {
  AgencyMembershipRecord,
  AgencyMembershipResolution,
} from "@/lib/agency/membership.types";
import type { AgencyMemberRole } from "@/lib/agency/types";
import { syncAgencyAccountProfile } from "@/lib/auth/agency-account";
import { isSupabaseConfigured } from "@/lib/config/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type {
  AgencyInvitationStatus,
  AgencyMembershipRecord,
  AgencyMembershipResolution,
  AgencyMembershipStatus,
} from "@/lib/agency/membership.types";

function logMembership(step: string, data?: Record<string, unknown>) {
  console.info(`[Agency Membership] ${step}`, data ?? {});
}

async function getUserClient() {
  if (!isSupabaseConfigured()) return null;
  return createClient();
}

/** List memberships for the authenticated user (RLS-aware). */
export async function listAgencyMembershipsForUser(userId: string): Promise<AgencyMembershipRecord[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];

  logMembership("Finding membership rows", { table: "agency_organization_members", userId });

  const { data, error } = await supabase
    .from("agency_organization_members")
    .select("id, organization_id, user_id, role, status, invitation_status, accepted_at, last_active_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    logMembership("Membership query failed", { userId, error: error.message, code: error.code });
    return [];
  }

  logMembership("Membership rows loaded", {
    userId,
    count: data?.length ?? 0,
    organizationIds: (data ?? []).map((row) => row.organization_id),
  });

  return (data ?? []) as AgencyMembershipRecord[];
}

/** Service-role membership lookup (Testing Center / repair). */
export async function listAgencyMembershipsForUserAdmin(
  admin: SupabaseClient,
  userId: string
): Promise<AgencyMembershipRecord[]> {
  const { data, error } = await admin
    .from("agency_organization_members")
    .select("id, organization_id, user_id, role, status, invitation_status, accepted_at, last_active_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    logMembership("Admin membership query failed", { userId, error: error.message });
    return [];
  }

  return (data ?? []) as AgencyMembershipRecord[];
}

async function loadAgencyOrganizationForMember(
  supabase: NonNullable<Awaited<ReturnType<typeof getUserClient>>>,
  orgId: string,
  userId: string
) {
  logMembership("Finding agency organization", {
    table: "agency_organizations",
    organizationId: orgId,
    userId,
  });

  const { data, error } = await supabase
    .from("agency_organizations")
    .select("*")
    .eq("id", orgId)
    .maybeSingle();

  if (error) {
    return {
      ok: false as const,
      code: "organization_query_failed" as const,
      message: error.message,
      details: { table: "agency_organizations", organizationId: orgId, userId },
    };
  }

  if (!data) {
    return {
      ok: false as const,
      code: "organization_not_found" as const,
      message: "Agency organization record not found.",
      details: { table: "agency_organizations", organizationId: orgId, userId },
    };
  }

  return { ok: true as const, organization: data as Record<string, unknown> };
}

/**
 * Membership-first resolution: User → agency_organization_members → agency_organizations → role/permissions.
 * Never trusts profiles.primary_agency_id alone.
 */
export async function resolveAgencyMembershipForUser(
  userId: string,
  preferredOrgId?: string | null
): Promise<AgencyMembershipResolution> {
  logMembership("Loading authenticated user", { userId });

  const supabase = await getUserClient();
  if (!supabase) {
    return {
      ok: false,
      code: "not_configured",
      message: "Database is not configured.",
      details: { userId },
    };
  }

  const memberships = await listAgencyMembershipsForUser(userId);
  if (!memberships.length) {
    return {
      ok: false,
      code: "no_membership",
      message: "You are not linked to an agency. No row exists in agency_organization_members for this user.",
      details: { table: "agency_organization_members", userId, preferredOrgId: preferredOrgId ?? null },
    };
  }

  const membership =
    (preferredOrgId
      ? memberships.find((row) => row.organization_id === preferredOrgId)
      : null) ?? memberships[0]!;

  logMembership("Active membership selected", {
    membershipId: membership.id,
    organizationId: membership.organization_id,
    role: membership.role,
    userId,
  });

  const orgResult = await loadAgencyOrganizationForMember(supabase, membership.organization_id, userId);
  if (!orgResult.ok) {
    return orgResult;
  }

  const permissions = getAgencyPermissions(membership.role);
  logMembership("Permissions loaded", {
    userId,
    organizationId: membership.organization_id,
    role: membership.role,
    plan: orgResult.organization.plan,
  });

  if (preferredOrgId && preferredOrgId !== membership.organization_id) {
    logMembership("Profile primary_agency_id stale; using membership org", {
      userId,
      preferredOrgId,
      resolvedOrgId: membership.organization_id,
    });
  }

  return {
    ok: true,
    membership,
    organization: orgResult.organization,
    permissions,
  };
}

/** Update last_active_at for the active membership (fire-and-forget). */
export async function touchAgencyMembershipActivity(membershipId: string) {
  try {
    const admin = getSupabaseAdmin();
    await admin
      .from("agency_organization_members")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", membershipId);
  } catch {
    // Non-blocking — activity tracking should not break dashboard load
  }
}

/** Ensure membership row exists (service role). Idempotent. */
export async function ensureAgencyMembership(
  admin: SupabaseClient,
  input: {
    userId: string;
    organizationId: string;
    role: AgencyMemberRole;
  }
): Promise<AgencyMembershipRecord> {
  logMembership("Ensuring membership row", {
    table: "agency_organization_members",
    userId: input.userId,
    organizationId: input.organizationId,
    role: input.role,
  });

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("agency_organization_members")
    .upsert(
      {
        organization_id: input.organizationId,
        user_id: input.userId,
        role: input.role,
        status: "active",
        invitation_status: "accepted",
        accepted_at: now,
        last_active_at: now,
      },
      { onConflict: "organization_id,user_id" }
    )
    .select("id, organization_id, user_id, role, status, invitation_status, accepted_at, last_active_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to upsert agency_organization_members");
  }

  await syncAgencyAccountProfile(admin, {
    userId: input.userId,
    organizationId: input.organizationId,
    memberRole: input.role,
  });

  return data as AgencyMembershipRecord;
}

/** Validate org subscription fields exist; patch test defaults if missing. */
export async function ensureAgencySubscription(
  admin: SupabaseClient,
  organizationId: string,
  plan: "starter" | "pro" | "enterprise" = "starter"
) {
  const { data: org } = await admin
    .from("agency_organizations")
    .select("id, plan, plan_started_at, stripe_subscription_id")
    .eq("id", organizationId)
    .maybeSingle();

  if (!org) return;

  const patch: Record<string, unknown> = {};
  if (!org.plan) patch.plan = plan;
  if (!org.plan_started_at) patch.plan_started_at = new Date(Date.now() - 90 * 86400000).toISOString();
  if (!org.stripe_subscription_id) patch.stripe_subscription_id = `test_sub_${organizationId.slice(0, 8)}`;

  if (Object.keys(patch).length) {
    logMembership("Patching agency subscription defaults", { organizationId, patch });
    await admin.from("agency_organizations").update(patch).eq("id", organizationId);
  }
}

export async function verifyAgencyMembershipAdmin(
  admin: SupabaseClient,
  userId: string
): Promise<AgencyMembershipResolution> {
  const memberships = await listAgencyMembershipsForUserAdmin(admin, userId);
  if (!memberships.length) {
    return {
      ok: false,
      code: "no_membership",
      message: "No agency_organization_members row for user.",
      details: { table: "agency_organization_members", userId },
    };
  }

  const membership = memberships[0]!;
  const { data: org, error } = await admin
    .from("agency_organizations")
    .select("*")
    .eq("id", membership.organization_id)
    .maybeSingle();

  if (error || !org) {
    return {
      ok: false,
      code: "organization_not_found",
      message: error?.message ?? "Agency organization missing.",
      details: { table: "agency_organizations", organizationId: membership.organization_id, userId },
    };
  }

  return {
    ok: true,
    membership,
    organization: org as Record<string, unknown>,
    permissions: getAgencyPermissions(membership.role),
  };
}

export function getAdminClientForMembershipRepair() {
  return getSupabaseAdmin();
}
