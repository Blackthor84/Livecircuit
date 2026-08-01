import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureAgencyMembership } from "@/lib/agency/server";
import { AGENCY_MEMBER_ROLE_LABELS } from "@/lib/agency";
import type { AgencyMemberRole } from "@/lib/agency";
import type { AgencyScenarioSlug } from "@/lib/agency";
import { fakeAvatar, fakeBio } from "@/lib/testing/fake-data";
import type { AgencyGenerationMode } from "@/lib/testing/constants";
import {
  resolveOrCreateTestAuthUser,
  stableAgencyRoleSeed,
} from "@/lib/testing/test-email.server";
import { fakePerson } from "@/lib/testing/fake-data";
import {
  logTestStep,
  requireDbResult,
  throwParsedError,
  type TestCreationLog,
} from "@/lib/testing/step-errors";
import { logServiceRoleClientVerification } from "@/lib/testing/log-auth-create-user";

export type CreatedAgencyTestUser = {
  userId: string;
  email: string;
  username: string;
  displayName: string;
  accountType: "agency";
  memberRole: AgencyMemberRole;
  organizationId: string;
  scenario: AgencyScenarioSlug | string;
  reused: boolean;
};

export async function createAgencyTestUser(
  admin: SupabaseClient,
  log: TestCreationLog,
  input: {
    organizationId: string;
    memberRole: AgencyMemberRole;
    scenario: AgencyScenarioSlug | string;
    createdBy: string;
    seed: number;
    orgName?: string;
    generationMode?: AgencyGenerationMode;
    roleSlot?: number;
  }
): Promise<CreatedAgencyTestUser> {
  const generationMode = input.generationMode ?? "repair";
  const roleSlot = input.roleSlot ?? 0;
  const authSeed =
    generationMode === "repair"
      ? stableAgencyRoleSeed(input.scenario, input.memberRole, roleSlot)
      : input.seed;
  const person = fakePerson(authSeed, input.memberRole);
  const password = `Test!${authSeed}Lc`;
  const roleLabel = AGENCY_MEMBER_ROLE_LABELS[input.memberRole];
  const displayName =
    input.orgName && input.memberRole === "owner"
      ? `${input.orgName} (${roleLabel})`
      : `${person.displayName} — ${roleLabel}`;

  logServiceRoleClientVerification(admin);

  const authUser = await resolveOrCreateTestAuthUser(admin, {
    mode: generationMode,
    roleLabel: input.memberRole,
    displayName,
    password,
    userMetadata: {
      full_name: displayName,
      username: person.username,
      intended_role: "agency",
      agency_member_role: input.memberRole,
      is_test_account: true,
    },
    log,
    stableKey:
      generationMode === "repair"
        ? `${input.scenario}:${input.memberRole}:${roleSlot}`
        : undefined,
    organizationName: input.orgName,
    organizationSlug: input.scenario,
  });

  const userId = authUser.userId;

  if (authUser.reused) {
    logTestStep(log, `Repairing agency profile (${input.memberRole})...`);
  } else {
    logTestStep(log, `Verifying agency profile role (${input.memberRole})...`);
  }

  const profileResult = await admin.from("profiles").select("id, role").eq("id", userId).maybeSingle();
  const profile = profileResult.data;

  if (!profile) {
    throwParsedError(
      log,
      `Agency profile verify ${input.memberRole}`,
      new Error("Profile not found for Auth user"),
      "Profile row missing — signup trigger may not have run"
    );
  }

  if (profile.role !== "agency") {
    logTestStep(log, `Repairing profile role to agency (${input.memberRole})...`);
  }

  logTestStep(log, `Ensuring agency account flags (${input.memberRole})...`);
  const profileUpdate = await admin
    .from("profiles")
    .update({
      display_name: displayName,
      username: authUser.username,
      avatar_url: fakeAvatar(authSeed),
      bio: fakeBio("agency", authSeed, roleLabel),
      role: "agency",
      primary_agency_id: input.organizationId,
      agency_member_role: input.memberRole,
      onboarding_completed: true,
      is_test_account: true,
      test_scenario: input.scenario,
      test_created_by: input.createdBy,
      test_created_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id, role, primary_agency_id, agency_member_role")
    .maybeSingle();

  requireDbResult(log, `Agency profile update ${input.memberRole}`, profileUpdate, {
    requireRows: true,
    emptyMessage: "Agency profile update returned no rows",
  });

  logTestStep(log, `Ensuring agency_organization_members row (${input.memberRole})...`);
  await ensureAgencyMembership(admin, {
    userId,
    organizationId: input.organizationId,
    role: input.memberRole,
  });

  logTestStep(log, `Membership verified (${input.memberRole}). Continuing...`);

  return {
    userId,
    email: authUser.email,
    username: authUser.username,
    displayName,
    accountType: "agency",
    memberRole: input.memberRole,
    organizationId: input.organizationId,
    scenario: input.scenario,
    reused: authUser.reused,
  };
}

export async function createAgencyTestUserStandalone(input: {
  organizationId: string;
  memberRole: AgencyMemberRole;
  scenario: AgencyScenarioSlug | string;
  createdBy: string;
  seed?: number;
  orgName?: string;
  generationMode?: AgencyGenerationMode;
  roleSlot?: number;
}) {
  const admin = getSupabaseAdmin();
  const log = { steps: [] as string[] };
  return createAgencyTestUser(admin, log, {
    ...input,
    seed: input.seed ?? Date.now() % 100000,
  });
}
