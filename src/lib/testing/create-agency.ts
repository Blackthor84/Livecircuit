import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fakeBio, fakePerson } from "@/lib/testing/fake-data";
import {
  AGENCY_SCENARIOS,
  AGENCY_TEAM_ROLES,
  seedAgencyScenario,
  type AgencyScenarioSlug,
} from "@/lib/testing/scenarios/agency";
import type { AgencyMemberRole } from "@/lib/agency/types";
import {
  createTestCreationLog,
  logTestStep,
  requireDbResult,
  TestCreationStepError,
  throwDbError,
  throwParsedError,
  type TestCreationLog,
} from "@/lib/testing/step-errors";
import {
  buildAuthCreateUserLogPayload,
  logAuthErrorComplete,
  logServiceRoleClientVerification,
} from "@/lib/testing/log-auth-create-user";

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
  const person = fakePerson(seed);
  const password = `Test!${seed}Lc`;
  const slug = `test-agency-${seed}`;

  logTestStep(log, "Step 1: Creating agency owner auth user...");
  logServiceRoleClientVerification(admin);

  const authPayload = buildAuthCreateUserLogPayload({
    email: person.email,
    type: "fan",
    person,
  });
  console.log("[Testing Center] agency owner createUser payload:", authPayload);

  let authData: Awaited<ReturnType<typeof admin.auth.admin.createUser>>["data"];
  let authError: Awaited<ReturnType<typeof admin.auth.admin.createUser>>["error"];

  try {
    const result = await admin.auth.admin.createUser({
      email: person.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: person.displayName,
        username: person.username,
        intended_role: "fan",
        is_test_account: true,
      },
    });
    authData = result.data;
    authError = result.error;
  } catch (thrown) {
    logAuthErrorComplete("agency owner createUser threw", thrown);
    throwParsedError(log, "Step 1: Creating agency owner", thrown, "auth.admin.createUser threw");
  }

  if (authError || !authData?.user) {
    throwParsedError(log, "Step 1: Creating agency owner", authError ?? new Error("No user"), "Failed to create owner");
  }

  const ownerUserId = authData.user.id;

  logTestStep(log, "Step 2: Setting owner profile flags...");
  const profileUpdate = await admin
    .from("profiles")
    .update({
      display_name: person.displayName,
      username: person.username,
      bio: fakeBio("fan", seed),
      role: "fan",
      onboarding_completed: true,
      is_test_account: true,
      test_scenario: `agency_${input.scenario}`,
      test_created_by: input.createdBy,
      test_created_at: new Date().toISOString(),
    })
    .eq("id", ownerUserId)
    .select("id")
    .maybeSingle();

  requireDbResult(log, "Step 2: Owner profile update", profileUpdate, {
    requireRows: true,
    emptyMessage: "Owner profile update returned no rows",
  });

  logTestStep(log, "Step 3: Creating test agency organization...");
  const orgName = `${person.displayName.split(" ")[0]} Talent Group`;
  const { data: org, error: orgError } = await admin
    .from("agency_organizations")
    .insert({
      slug,
      name: orgName,
      biography: `Test agency for LiveCircuit QA — ${config.label}.`,
      plan: config.plan,
      verified: input.scenario !== "boutique_agency",
      is_test: true,
      genres: ["music", "comedy"],
      years_in_business: 5 + (seed % 20),
      metadata: { test: true, scenario: input.scenario },
    })
    .select("id, name")
    .single();

  if (orgError || !org) throwDbError(log, "Step 3: Create agency org", orgError ?? new Error("No org"));

  logTestStep(log, "Step 4: Adding agency owner membership...");
  const { error: memberError } = await admin.from("agency_organization_members").insert({
    organization_id: org.id,
    user_id: ownerUserId,
    role: "owner",
    accepted_at: new Date().toISOString(),
  });
  if (memberError) throwDbError(log, "Step 4: Owner membership", memberError);

  const teamUserIds: CreatedTestAgency["teamUserIds"] = [];

  if (input.seedTeamMembers) {
    logTestStep(log, "Step 5: Creating team member test users...");
    const rolesToSeed = AGENCY_TEAM_ROLES.filter((r) => r !== "owner");
    for (let i = 0; i < rolesToSeed.length; i++) {
      const role = rolesToSeed[i]!;
      const memberPerson = fakePerson(seed + i + 1000);
      const memberPassword = `Test!${seed + i}Lc`;

      const { data: memberAuth, error: memberAuthError } = await admin.auth.admin.createUser({
        email: memberPerson.email,
        password: memberPassword,
        email_confirm: true,
        user_metadata: {
          full_name: memberPerson.displayName,
          username: memberPerson.username,
          is_test_account: true,
        },
      });

      if (memberAuthError || !memberAuth.user) {
        throwParsedError(
          log,
          `Step 5: Team member ${role}`,
          memberAuthError ?? new Error("No user"),
          "Failed to create team member"
        );
      }

      await admin
        .from("profiles")
        .update({
          display_name: memberPerson.displayName,
          username: memberPerson.username,
          is_test_account: true,
          test_scenario: `agency_${role}`,
          test_created_by: input.createdBy,
          test_created_at: new Date().toISOString(),
        })
        .eq("id", memberAuth.user!.id);

      await admin.from("agency_organization_members").insert({
        organization_id: org.id,
        user_id: memberAuth.user!.id,
        role,
        invited_by: ownerUserId,
        invited_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
      });

      teamUserIds.push({
        userId: memberAuth.user!.id,
        role,
        email: memberPerson.email,
      });
    }
  }

  logTestStep(log, "Step 6: Seeding agency scenario data...");
  await seedAgencyScenario(admin, log, org.id as string, ownerUserId, input.scenario, seed);

  return {
    orgId: org.id as string,
    orgName: org.name as string,
    ownerUserId,
    ownerEmail: person.email,
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
