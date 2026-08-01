import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAgencyPermissions } from "@/lib/agency/permissions";
import type { AgencyMembershipRecord } from "@/lib/agency/membership.types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

export type MembershipDiagnosticStep = {
  key: string;
  ok: boolean;
  issue?: string;
  details?: Record<string, unknown>;
};

export type AgencyMembershipDiagnosticReport = {
  ok: boolean;
  userId: string;
  table: "agency_organization_members";
  authUid: string | null;
  authMatchesUser: boolean;
  client: "user" | "admin";
  steps: MembershipDiagnosticStep[];
  membership: AgencyMembershipRecord | null;
  firstFailure: string | null;
};

const MEMBERSHIP_SELECT =
  "id, organization_id, user_id, role, status, invitation_status, accepted_at, last_active_at";

function logDiagnostic(report: AgencyMembershipDiagnosticReport) {
  console.info("[Agency Membership Diagnostic]", {
    ok: report.ok,
    userId: report.userId,
    authUid: report.authUid,
    authMatchesUser: report.authMatchesUser,
    firstFailure: report.firstFailure,
    membershipId: report.membership?.id ?? null,
    organizationId: report.membership?.organization_id ?? null,
    role: report.membership?.role ?? null,
  });
  for (const step of report.steps) {
    const mark = step.ok ? "✓" : "✗";
    console.info(`[Agency Membership Diagnostic] ${mark} ${step.key}`, step.issue ?? step.details ?? {});
  }
}

export function isActiveAgencyMembership(row: AgencyMembershipRecord) {
  return !row.status || row.status === "active" || row.status === "invited";
}

export async function runAgencyMembershipDiagnostic(
  userId: string,
  preferredOrgId?: string | null
): Promise<AgencyMembershipDiagnosticReport> {
  const steps: MembershipDiagnosticStep[] = [];
  let firstFailure: string | null = null;

  const fail = (key: string, issue: string, details?: Record<string, unknown>) => {
    if (!firstFailure) firstFailure = key;
    steps.push({ key, ok: false, issue, details });
  };

  const pass = (key: string, details?: Record<string, unknown>) => {
    steps.push({ key, ok: true, details });
  };

  if (!isSupabaseConfigured()) {
    fail("database", "Supabase is not configured");
    const report = {
      ok: false,
      userId,
      table: "agency_organization_members" as const,
      authUid: null,
      authMatchesUser: false,
      client: "user" as const,
      steps,
      membership: null,
      firstFailure,
    };
    logDiagnostic(report);
    return report;
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const authUid = authUser?.id ?? null;
  const authMatchesUser = authUid === userId;

  pass("authenticated_user", { userId, email: authUser?.email ?? null });
  pass("auth_uid", { authUid, authMatchesUser });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, primary_agency_id, agency_member_role, is_test_account, display_name")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    fail("profile", profileError.message, { code: profileError.code });
  } else if (!profile) {
    fail("profile", "No profile row for user");
  } else {
    pass("profile", {
      role: profile.role,
      primaryAgencyId: profile.primary_agency_id,
      agencyMemberRole: profile.agency_member_role,
      isTestAccount: profile.is_test_account,
    });
  }

  if (profile && profile.role !== "agency") {
    fail("account_type", `Expected role=agency, found role=${profile.role}`);
  } else if (profile) {
    pass("account_type", { role: "agency" });
  }

  let userMemberships: AgencyMembershipRecord[] = [];
  const { data: userRows, error: userMembershipError } = await supabase
    .from("agency_organization_members")
    .select(MEMBERSHIP_SELECT)
    .eq("user_id", userId);

  if (userMembershipError) {
    fail("membership_user_client", userMembershipError.message, {
      table: "agency_organization_members",
      code: userMembershipError.code,
      hint: userMembershipError.hint,
    });
  } else {
    userMemberships = (userRows ?? []) as AgencyMembershipRecord[];
    pass("membership_user_client", {
      table: "agency_organization_members",
      count: userMemberships.length,
      organizationIds: userMemberships.map((row) => row.organization_id),
    });
  }

  const admin = getSupabaseAdmin();
  const { data: adminRows, error: adminMembershipError } = await admin
    .from("agency_organization_members")
    .select(MEMBERSHIP_SELECT)
    .eq("user_id", userId);

  const adminMemberships = (adminRows ?? []) as AgencyMembershipRecord[];
  if (adminMembershipError) {
    fail("membership_admin_client", adminMembershipError.message, { code: adminMembershipError.code });
  } else {
    pass("membership_admin_client", {
      table: "agency_organization_members",
      count: adminMemberships.length,
      organizationIds: adminMemberships.map((row) => row.organization_id),
    });
  }

  if (!userMemberships.length && adminMemberships.length) {
    fail("rls_visibility", "Membership visible to service role but not user client (RLS or auth mismatch)", {
      authUid,
      userId,
      authMatchesUser,
    });
  }

  const pool = userMemberships.length ? userMemberships : adminMemberships;
  const membership =
    (preferredOrgId ? pool.find((row) => row.organization_id === preferredOrgId) : null) ??
    pool.find(isActiveAgencyMembership) ??
    pool[0] ??
    null;

  if (!membership) {
    fail("membership", "No row exists in agency_organization_members for this user.", {
      table: "agency_organization_members",
      userId,
      preferredOrgId: preferredOrgId ?? null,
    });
  } else {
    pass("membership", {
      membershipId: membership.id,
      organizationId: membership.organization_id,
      role: membership.role,
      status: membership.status ?? null,
      invitationStatus: membership.invitation_status ?? null,
    });

    if (!isActiveAgencyMembership(membership)) {
      fail("membership_status", `Membership status is ${membership.status ?? "unknown"}`, {
        membershipId: membership.id,
      });
    } else {
      pass("membership_status", { status: membership.status ?? "active" });
    }

    const permissions = getAgencyPermissions(membership.role);
    if (!Object.keys(permissions).length) {
      fail("permissions", `No permissions mapped for role ${membership.role}`);
    } else {
      pass("permissions", { role: membership.role, permissionCount: Object.keys(permissions).length });
    }
  }

  if (membership) {
    const orgClient = userMemberships.length ? supabase : admin;
    const { data: org, error: orgError } = await orgClient
      .from("agency_organizations")
      .select("id, name, plan, stripe_subscription_id, is_test, verified, metadata")
      .eq("id", membership.organization_id)
      .maybeSingle();

    if (orgError) {
      fail("agency", orgError.message, { organizationId: membership.organization_id, code: orgError.code });
    } else if (!org) {
      fail("agency", "Agency organization record missing", { organizationId: membership.organization_id });
    } else {
      pass("agency", {
        organizationId: org.id,
        name: org.name,
        plan: org.plan,
        isTest: org.is_test,
      });

      if (!org.plan) {
        fail("subscription", "Agency plan missing on organization");
      } else {
        pass("subscription", {
          plan: org.plan,
          stripeSubscriptionId: org.stripe_subscription_id ?? null,
        });
      }

      const metadata = (org.metadata ?? {}) as Record<string, unknown>;
      if (!metadata.dashboard_settings) {
        fail("dashboard", "Dashboard settings missing from organization metadata");
      } else {
        pass("dashboard", { hasDashboardSettings: true });
      }
    }
  }

  const report: AgencyMembershipDiagnosticReport = {
    ok: firstFailure === null,
    userId,
    table: "agency_organization_members",
    authUid,
    authMatchesUser,
    client: userMemberships.length ? "user" : adminMemberships.length ? "admin" : "user",
    steps,
    membership,
    firstFailure,
  };

  logDiagnostic(report);
  return report;
}

export async function verifyMembershipRowAdmin(
  admin: SupabaseClient,
  input: { userId: string; organizationId: string }
): Promise<AgencyMembershipRecord | null> {
  const { data } = await admin
    .from("agency_organization_members")
    .select(MEMBERSHIP_SELECT)
    .eq("user_id", input.userId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  return (data as AgencyMembershipRecord | null) ?? null;
}
