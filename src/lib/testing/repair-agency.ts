import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { syncAgencyAccountProfile, validateAgencyImpersonationTarget } from "@/lib/auth/agency-account";
import {
  ensureAgencyMembership,
  ensureAgencySubscription,
  listAgencyMembershipsForUserAdmin,
  verifyAgencyMembershipAdmin,
} from "@/lib/agency/membership.server";
import { AGENCY_SCENARIOS, getAgencyOrgTemplate, type AgencyScenarioSlug } from "@/lib/agency/org-templates";
import {
  ensureAgencyOrganizationComplete,
  validateAgencyOrganizationHealth,
} from "@/lib/agency/organization-health.server";
import type { AgencyMemberRole } from "@/lib/agency/types";
import { createTestCreationLog, logTestStep } from "@/lib/testing/step-errors";

export type TestAgencyValidation = {
  ok: boolean;
  issues: string[];
  orgId: string | null;
  userId: string;
  checks?: { key: string; ok: boolean; issue?: string }[];
};

function normalizeScenarioSlug(raw: string | null | undefined): AgencyScenarioSlug {
  const base = (raw ?? "boutique_agency").replace(
    /_(owner|admin|booking_manager|artist_manager|marketing|finance|assistant|read_only)(_\d+)?$/,
    ""
  );
  return (AGENCY_SCENARIOS.some((s) => s.slug === base) ? base : "boutique_agency") as AgencyScenarioSlug;
}

export async function validateTestAgencyAccount(userId: string): Promise<TestAgencyValidation> {
  const admin = getSupabaseAdmin();
  const issues: string[] = [];

  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, primary_agency_id, agency_member_role, is_test_account, test_scenario")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return { ok: false, issues: ["Profile missing"], orgId: null, userId };
  if (profile.role !== "agency") issues.push("Account is not role=agency");
  if (!profile.is_test_account) issues.push("Not a test account");

  const memberships = await listAgencyMembershipsForUserAdmin(admin, userId);
  if (!memberships.length) issues.push("agency_organization_members row missing");

  let orgId: string | null =
    memberships[0]?.organization_id ?? (profile.primary_agency_id as string | null) ?? null;

  let checks: TestAgencyValidation["checks"];
  if (orgId) {
    const health = await validateAgencyOrganizationHealth(admin, { userId, organizationId: orgId });
    checks = health.checks;
    for (const check of health.checks) {
      if (!check.ok && check.issue) issues.push(check.issue);
    }
  } else {
    issues.push("No agency organization linked");
  }

  if (memberships[0] && !memberships[0].role) issues.push("Agency member role missing");

  return { ok: issues.length === 0, issues, orgId, userId, checks };
}

async function findOrgFromSiblingOwner(
  admin: ReturnType<typeof getSupabaseAdmin>,
  profile: { test_scenario: string | null; test_created_by: string | null }
): Promise<{ orgId: string; ownerUserId: string | null } | null> {
  const scenarioBase = normalizeScenarioSlug(profile.test_scenario);
  const { data: owners } = await admin
    .from("profiles")
    .select("id, primary_agency_id, test_scenario")
    .eq("is_test_account", true)
    .eq("role", "agency")
    .eq("agency_member_role", "owner")
    .like("test_scenario", `${scenarioBase}%`)
    .limit(5);

  for (const owner of owners ?? []) {
    if (owner.primary_agency_id) {
      return { orgId: owner.primary_agency_id as string, ownerUserId: owner.id as string };
    }
    const ownerMemberships = await listAgencyMembershipsForUserAdmin(admin, owner.id as string);
    if (ownerMemberships[0]) {
      return { orgId: ownerMemberships[0].organization_id, ownerUserId: owner.id as string };
    }
  }

  return null;
}

export async function ensureAgencyAccountDependencies(input: {
  userId: string;
  repairedBy: string;
}): Promise<{ ok: true; orgId: string; message: string } | { ok: false; error: string }> {
  const admin = getSupabaseAdmin();
  const log = createTestCreationLog();

  const { data: profile } = await admin
    .from("profiles")
    .select(
      "id, role, primary_agency_id, agency_member_role, is_test_account, test_scenario, test_created_by, display_name"
    )
    .eq("id", input.userId)
    .maybeSingle();

  if (!profile) return { ok: false, error: "User profile not found." };
  if (!profile.is_test_account) {
    return { ok: false, error: "Only test accounts can be auto-repaired from Testing Center." };
  }
  if (profile.role !== "agency") {
    return { ok: false, error: "This account is not an agency test user." };
  }

  const scenario = normalizeScenarioSlug(profile.test_scenario as string | null);
  const template = getAgencyOrgTemplate(scenario);

  let orgId: string | null = null;
  const memberships = await listAgencyMembershipsForUserAdmin(admin, input.userId);

  if (memberships.length) {
    orgId = memberships[0]!.organization_id;
    logTestStep(log, `Found existing membership → org ${orgId}`);
  }

  if (!orgId && profile.primary_agency_id) {
    const { data: org } = await admin
      .from("agency_organizations")
      .select("id")
      .eq("id", profile.primary_agency_id as string)
      .maybeSingle();
    if (org) {
      orgId = org.id as string;
      logTestStep(log, `Found agency via profile.primary_agency_id → org ${orgId}`);
    }
  }

  if (!orgId) {
    const sibling = await findOrgFromSiblingOwner(admin, {
      test_scenario: profile.test_scenario as string | null,
      test_created_by: profile.test_created_by as string | null,
    });
    if (sibling) {
      orgId = sibling.orgId;
      logTestStep(log, `Found agency via sibling owner → org ${orgId}`);
    }
  }

  if (!orgId) {
    logTestStep(log, "Creating missing test agency organization...");
    const seed = Date.now() % 100000;
    const { data: org, error: orgError } = await admin
      .from("agency_organizations")
      .insert({
        slug: `test-agency-repair-${seed}`,
        name: `${template.label} — Repaired QA`,
        biography: "Repaired test agency organization.",
        plan: template.plan,
        verified: scenario !== "boutique_agency",
        is_test: true,
        genres: ["music", "comedy", "podcast"],
        years_in_business: 8,
        plan_started_at: new Date(Date.now() - 90 * 86400000).toISOString(),
        plan_renews_at: new Date(Date.now() + 275 * 86400000).toISOString(),
        stripe_subscription_id: `test_sub_repair_${seed}`,
        metadata: {
          test: true,
          repaired: true,
          scenario,
          dashboard_settings: { widgets: ["overview", "bookings", "revenue"], layout: "default" },
          settings: { timezone: "America/New_York", notifications_enabled: true },
        },
      })
      .select("id")
      .single();

    if (orgError || !org) {
      return { ok: false, error: orgError?.message ?? "Failed to create agency organization" };
    }
    orgId = org.id as string;
  }

  await ensureAgencySubscription(admin, orgId, template.plan);

  const memberRole = ((memberships[0]?.role as AgencyMemberRole | undefined) ??
    (profile.agency_member_role as AgencyMemberRole | null) ??
    "owner") as AgencyMemberRole;

  logTestStep(log, `Ensuring agency_organization_members row (${memberRole})...`);
  await ensureAgencyMembership(admin, {
    userId: input.userId,
    organizationId: orgId,
    role: memberRole,
  });

  logTestStep(log, "Verifying and repairing complete organization...");
  const complete = await ensureAgencyOrganizationComplete(admin, {
    userId: input.userId,
    organizationId: orgId,
    memberRole,
    scenario,
  });

  if (!complete.ok) {
    return { ok: false, error: complete.error };
  }

  const verified = await verifyAgencyMembershipAdmin(admin, input.userId);
  if (!verified.ok) {
    return { ok: false, error: verified.message };
  }

  const impersonation = await validateAgencyImpersonationTarget(admin, {
    id: input.userId,
    role: "agency",
    primary_agency_id: orgId,
    agency_member_role: verified.membership.role,
  });

  if (!impersonation.ok) {
    return { ok: false, error: impersonation.error };
  }

  return {
    ok: true,
    orgId,
    message: `Organization repaired (${template.label}). Membership, subscription, permissions, and dashboard data verified.`,
  };
}

export async function repairTestAgencyAccount(input: {
  userId: string;
  repairedBy: string;
}): Promise<{ ok: true; orgId: string; message: string } | { ok: false; error: string }> {
  return ensureAgencyAccountDependencies(input);
}

export async function verifyAndRepairAgencyForImpersonation(input: {
  userId: string;
  repairedBy: string;
  role: string;
  primary_agency_id: string | null;
  agency_member_role: string | null;
}) {
  const admin = getSupabaseAdmin();

  let validation = await validateAgencyImpersonationTarget(admin, {
    id: input.userId,
    role: input.role,
    primary_agency_id: input.primary_agency_id,
    agency_member_role: input.agency_member_role,
  });

  if (validation.ok) {
    const orgId = validation.orgId;
    const { data: profile } = await admin
      .from("profiles")
      .select("agency_member_role")
      .eq("id", input.userId)
      .maybeSingle();

    const memberRole = ((profile?.agency_member_role as AgencyMemberRole | null) ??
      (input.agency_member_role as AgencyMemberRole | null) ??
      "owner") as AgencyMemberRole;

    const scenario = normalizeScenarioSlug(
      (
        await admin.from("profiles").select("test_scenario").eq("id", input.userId).maybeSingle()
      ).data?.test_scenario as string | null
    );

    await ensureAgencyOrganizationComplete(admin, {
      userId: input.userId,
      organizationId: orgId,
      memberRole,
      scenario,
    });

    return validation;
  }

  console.warn("[Agency Impersonation] Validation failed — auto-repairing", {
    userId: input.userId,
    code: validation.code,
    error: validation.error,
  });

  const repair = await ensureAgencyAccountDependencies({
    userId: input.userId,
    repairedBy: input.repairedBy,
  });

  if (!repair.ok) {
    return { ok: false as const, error: repair.error, code: "repair_failed" };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("primary_agency_id, agency_member_role")
    .eq("id", input.userId)
    .maybeSingle();

  validation = await validateAgencyImpersonationTarget(admin, {
    id: input.userId,
    role: "agency",
    primary_agency_id: (profile?.primary_agency_id as string | null) ?? repair.orgId,
    agency_member_role: (profile?.agency_member_role as string | null) ?? null,
  });

  return validation;
}

export { AGENCY_TEAM_ROLES } from "@/lib/agency/org-templates";
