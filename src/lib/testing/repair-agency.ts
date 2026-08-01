import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { syncAgencyAccountProfile } from "@/lib/auth/agency-account";
import { validateAgencyImpersonationTarget } from "@/lib/auth/agency-account";
import type { AgencyMemberRole } from "@/lib/agency/types";
import {
  AGENCY_SCENARIOS,
  seedAgencyScenario,
  type AgencyScenarioSlug,
} from "@/lib/testing/scenarios/agency";
import { createAgencyTestUser } from "@/lib/testing/create-agency-user";
import { createTestCreationLog, logTestStep } from "@/lib/testing/step-errors";

export type TestAgencyValidation = {
  ok: boolean;
  issues: string[];
  orgId: string | null;
  userId: string;
};

export async function validateTestAgencyAccount(userId: string): Promise<TestAgencyValidation> {
  const admin = getSupabaseAdmin();
  const issues: string[] = [];

  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, primary_agency_id, agency_member_role, is_test_account, test_scenario")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    return { ok: false, issues: ["Profile missing"], orgId: null, userId };
  }

  if (profile.role !== "agency") {
    issues.push("Account is not role=agency");
  }

  if (!profile.is_test_account) {
    issues.push("Not a test account");
  }

  let orgId = (profile.primary_agency_id as string | null) ?? null;

  const { data: memberships } = await admin
    .from("agency_organization_members")
    .select("organization_id, role")
    .eq("user_id", userId);

  if (!memberships?.length) {
    issues.push("Agency membership missing");
  } else if (!orgId) {
    orgId = memberships[0]!.organization_id as string;
    issues.push("primary_agency_id not set on profile");
  }

  if (orgId) {
    const { data: org } = await admin.from("agency_organizations").select("id, name").eq("id", orgId).maybeSingle();
    if (!org) {
      issues.push("Agency organization not found");
      orgId = null;
    }
  } else {
    issues.push("No agency organization linked");
  }

  return { ok: issues.length === 0, issues, orgId, userId };
}

export async function repairTestAgencyAccount(input: {
  userId: string;
  repairedBy: string;
}): Promise<{ ok: true; orgId: string; message: string } | { ok: false; error: string }> {
  const admin = getSupabaseAdmin();
  const log = createTestCreationLog();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, primary_agency_id, agency_member_role, is_test_account, test_scenario, display_name")
    .eq("id", input.userId)
    .maybeSingle();

  if (!profile?.is_test_account) {
    return { ok: false, error: "Only test accounts can be repaired from Testing Center." };
  }

  if (profile.role !== "agency") {
    return { ok: false, error: "This account is not an agency test user." };
  }

  let orgId = (profile.primary_agency_id as string | null) ?? null;
  const scenario = ((profile.test_scenario as string) ?? "boutique_agency").replace(/_[a-z_]+$/, "") as AgencyScenarioSlug;
  const config = AGENCY_SCENARIOS.find((s) => s.slug === scenario) ?? AGENCY_SCENARIOS[0]!;

  const { data: memberships } = await admin
    .from("agency_organization_members")
    .select("organization_id, role")
    .eq("user_id", input.userId);

  if (memberships?.length) {
    orgId = orgId ?? (memberships[0]!.organization_id as string);
  }

  if (orgId) {
    const { data: org } = await admin.from("agency_organizations").select("id").eq("id", orgId).maybeSingle();
    if (!org) orgId = null;
  }

  if (!orgId) {
    logTestStep(log, "Repair: creating missing test agency organization...");
    const seed = Date.now() % 100000;
    const { data: org, error: orgError } = await admin
      .from("agency_organizations")
      .insert({
        slug: `test-agency-repair-${seed}`,
        name: `${config.label} — Repaired QA`,
        biography: "Repaired test agency organization.",
        plan: config.plan,
        verified: scenario !== "boutique_agency",
        is_test: true,
        genres: ["music", "comedy"],
        plan_started_at: new Date(Date.now() - 90 * 86400000).toISOString(),
        plan_renews_at: new Date(Date.now() + 275 * 86400000).toISOString(),
        stripe_subscription_id: `test_sub_repair_${seed}`,
        metadata: { test: true, repaired: true },
      })
      .select("id")
      .single();

    if (orgError || !org) {
      return { ok: false, error: orgError?.message ?? "Failed to create agency organization" };
    }
    orgId = org.id as string;
  }

  const memberRole = ((memberships?.[0]?.role as AgencyMemberRole | undefined) ??
    (profile.agency_member_role as AgencyMemberRole | null) ??
    "owner") as AgencyMemberRole;

  if (!memberships?.length) {
    logTestStep(log, "Repair: creating agency membership...");
    await admin.from("agency_organization_members").upsert(
      {
        organization_id: orgId,
        user_id: input.userId,
        role: memberRole,
        accepted_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,user_id" }
    );
  }

  await syncAgencyAccountProfile(admin, {
    userId: input.userId,
    organizationId: orgId,
    memberRole,
  });

  logTestStep(log, "Repair: seeding agency scenario data if sparse...");
  await seedAgencyScenario(admin, log, orgId, input.userId, config.slug, Date.now() % 100000);

  const validation = await validateAgencyImpersonationTarget(admin, {
    id: input.userId,
    role: "agency",
    primary_agency_id: orgId,
    agency_member_role: memberRole,
  });

  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  return {
    ok: true,
    orgId,
    message: `Repaired test agency (${config.label}). You can impersonate again.`,
  };
}
