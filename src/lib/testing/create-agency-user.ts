import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { syncAgencyAccountProfile } from "@/lib/auth/agency-account";
import { AGENCY_MEMBER_ROLE_LABELS } from "@/lib/agency/permissions";
import type { AgencyMemberRole } from "@/lib/agency/types";
import { fakeAvatar, fakeBio, fakePerson } from "@/lib/testing/fake-data";
import type { AgencyScenarioSlug } from "@/lib/testing/scenarios/agency";
import {
  logTestStep,
  requireDbResult,
  throwParsedError,
  type TestCreationLog,
} from "@/lib/testing/step-errors";
import {
  buildAuthCreateUserLogPayload,
  logAuthErrorComplete,
  logServiceRoleClientVerification,
} from "@/lib/testing/log-auth-create-user";

export type CreatedAgencyTestUser = {
  userId: string;
  email: string;
  username: string;
  displayName: string;
  accountType: "agency";
  memberRole: AgencyMemberRole;
  organizationId: string;
  scenario: AgencyScenarioSlug | string;
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
  }
): Promise<CreatedAgencyTestUser> {
  const person = fakePerson(input.seed + input.memberRole.length);
  const password = `Test!${input.seed}Lc`;
  const roleLabel = AGENCY_MEMBER_ROLE_LABELS[input.memberRole];
  const displayName = input.orgName && input.memberRole === "owner"
    ? `${input.orgName} (${roleLabel})`
    : `${person.displayName} — ${roleLabel}`;

  logTestStep(log, `Creating agency account (${input.memberRole})...`);
  logServiceRoleClientVerification(admin);

  console.log(
    "[Testing Center] agency account createUser payload:",
    buildAuthCreateUserLogPayload({ email: person.email, type: "agency", person })
  );

  let authData: Awaited<ReturnType<typeof admin.auth.admin.createUser>>["data"];
  let authError: Awaited<ReturnType<typeof admin.auth.admin.createUser>>["error"];

  try {
    const result = await admin.auth.admin.createUser({
      email: person.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: displayName,
        username: person.username,
        intended_role: "agency",
        agency_member_role: input.memberRole,
        is_test_account: true,
      },
    });
    authData = result.data;
    authError = result.error;
  } catch (thrown) {
    logAuthErrorComplete("agency createUser threw", thrown);
    throwParsedError(log, `Agency account ${input.memberRole}`, thrown, "auth.admin.createUser threw");
  }

  if (authError || !authData?.user) {
    throwParsedError(
      log,
      `Agency account ${input.memberRole}`,
      authError ?? new Error("No user"),
      "Failed to create agency auth user"
    );
  }

  const userId = authData.user.id;

  logTestStep(log, `Verifying agency profile role (${input.memberRole})...`);
  const profile = requireDbResult<{ id: string; role: string }>(
    log,
    `Agency profile verify ${input.memberRole}`,
    await admin.from("profiles").select("id, role").eq("id", userId).maybeSingle(),
    { requireRows: true, emptyMessage: "Profile not created by signup trigger" }
  );

  if (profile.role !== "agency") {
    throwParsedError(
      log,
      `Agency profile verify ${input.memberRole}`,
      new Error(`Expected role agency, got ${profile.role}`),
      "Signup trigger did not assign agency role"
    );
  }

  logTestStep(log, `Setting agency account flags (${input.memberRole})...`);
  const profileUpdate = await admin
    .from("profiles")
    .update({
      display_name: displayName,
      username: person.username,
      avatar_url: fakeAvatar(input.seed),
      bio: fakeBio("agency", input.seed, roleLabel),
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

  await syncAgencyAccountProfile(admin, {
    userId,
    organizationId: input.organizationId,
    memberRole: input.memberRole,
  });

  logTestStep(log, `Adding org membership (${input.memberRole})...`);
  const { error: memberError } = await admin.from("agency_organization_members").upsert(
    {
      organization_id: input.organizationId,
      user_id: userId,
      role: input.memberRole,
      accepted_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,user_id" }
  );
  if (memberError) {
    throwParsedError(log, `Agency membership ${input.memberRole}`, memberError, memberError.message);
  }

  return {
    userId,
    email: person.email,
    username: person.username,
    displayName,
    accountType: "agency",
    memberRole: input.memberRole,
    organizationId: input.organizationId,
    scenario: input.scenario,
  };
}

export async function createAgencyTestUserStandalone(input: {
  organizationId: string;
  memberRole: AgencyMemberRole;
  scenario: AgencyScenarioSlug | string;
  createdBy: string;
  seed?: number;
  orgName?: string;
}) {
  const admin = getSupabaseAdmin();
  const log = { steps: [] as string[] };
  return createAgencyTestUser(admin, log, {
    ...input,
    seed: input.seed ?? Date.now() % 100000,
  });
}
