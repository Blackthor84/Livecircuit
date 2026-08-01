import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  AGENCY_SCENARIOS,
  AGENCY_TEAM_ROLES,
  seedAgencyScenario,
  type AgencyScenarioSlug,
} from "@/lib/testing/scenarios/agency";
import type { AgencyMemberRole } from "@/lib/agency/types";
import { createAgencyTestUser } from "@/lib/testing/create-agency-user";
import {
  createTestCreationLog,
  logTestStep,
  throwDbError,
  type TestCreationLog,
} from "@/lib/testing/step-errors";

export type CreatedTestAgency = {
  orgId: string;
  orgName: string;
  ownerUserId: string;
  ownerEmail: string;
  scenario: AgencyScenarioSlug;
  teamUserIds: { userId: string; role: AgencyMemberRole; email: string }[];
  steps: string[];
};

export async function createTestAgency(input: {
  scenario: AgencyScenarioSlug;
  createdBy: string;
  artistCount?: number;
  seedTeamMembers?: boolean;
  seed?: number;
}): Promise<CreatedTestAgency> {
  const log = createTestCreationLog();
  const admin = getSupabaseAdmin();
  const seed = input.seed ?? Date.now() % 100000;
  const config = AGENCY_SCENARIOS.find((s) => s.slug === input.scenario) ?? AGENCY_SCENARIOS[0]!;
  const slug = `test-agency-${seed}`;

  logTestStep(log, "Step 1: Creating test agency organization...");
  const orgName = `${config.label} — LiveCircuit QA`;
  const { data: org, error: orgError } = await admin
    .from("agency_organizations")
    .insert({
      slug,
      name: orgName,
      biography: `Realistic ${config.label.toLowerCase()} test organization for LiveCircuit agency QA.`,
      plan: config.plan,
      verified: input.scenario !== "boutique_agency",
      is_test: true,
      genres: ["music", "comedy", "podcast"],
      years_in_business: 5 + (seed % 20),
      plan_started_at: new Date(Date.now() - 90 * 86400000).toISOString(),
      plan_renews_at: new Date(Date.now() + 275 * 86400000).toISOString(),
      stripe_subscription_id: `test_sub_agency_${seed}`,
      metadata: { test: true, scenario: input.scenario, accountType: "AGENCY" },
    })
    .select("id, name")
    .single();

  if (orgError || !org) throwDbError(log, "Step 1: Create agency org", orgError ?? new Error("No org"));

  logTestStep(log, "Step 2: Creating agency owner account (accountType=AGENCY)...");
  const owner = await createAgencyTestUser(admin, log, {
    organizationId: org.id as string,
    memberRole: "owner",
    scenario: input.scenario,
    createdBy: input.createdBy,
    seed,
    orgName: org.name as string,
  });

  const teamUserIds: CreatedTestAgency["teamUserIds"] = [];

  if (input.seedTeamMembers) {
    logTestStep(log, "Step 3: Creating agency team accounts...");
    const rolesToSeed = AGENCY_TEAM_ROLES.filter((r) => r !== "owner");
    for (let i = 0; i < rolesToSeed.length; i++) {
      const role = rolesToSeed[i]!;
      const member = await createAgencyTestUser(admin, log, {
        organizationId: org.id as string,
        memberRole: role,
        scenario: `${input.scenario}_${role}`,
        createdBy: input.createdBy,
        seed: seed + i + 1000,
        orgName: org.name as string,
      });
      teamUserIds.push({ userId: member.userId, role, email: member.email });
    }
  } else {
    logTestStep(log, "Step 3: Skipped team accounts (enable seedTeamMembers to create all roles)");
  }

  logTestStep(log, "Step 4: Seeding agency scenario data...");
  await seedAgencyScenario(admin, log, org.id as string, owner.userId, input.scenario, seed, {
    teamUserIds: teamUserIds.map((t) => ({ userId: t.userId, role: t.role })),
  });

  logTestStep(log, "Agency organization ready for impersonation and dashboard testing.");

  return {
    orgId: org.id as string,
    orgName: org.name as string,
    ownerUserId: owner.userId,
    ownerEmail: owner.email,
    scenario: input.scenario,
    teamUserIds,
    steps: log.steps,
  };
}

export async function bulkGenerateTestAgencies(input: {
  count: number;
  scenario: AgencyScenarioSlug;
  createdBy: string;
  seedTeamMembers?: boolean;
  onProgress?: (done: number, total: number) => void;
}) {
  const created: CreatedTestAgency[] = [];
  for (let i = 0; i < input.count; i++) {
    const agency = await createTestAgency({
      scenario: input.scenario,
      createdBy: input.createdBy,
      seedTeamMembers: input.seedTeamMembers && i === 0,
      seed: Date.now() + i,
    });
    created.push(agency);
    input.onProgress?.(i + 1, input.count);
  }
  return created;
}
