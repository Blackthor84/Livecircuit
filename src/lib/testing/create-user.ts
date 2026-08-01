import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fakeAvatar, fakeBio, fakeLocation, fakeSocialLinks, fakeStageName } from "@/lib/testing/fake-data";
import type { ArtistScenarioSlug, FanScenarioSlug, TestScenarioSlug, TestUserType } from "@/lib/testing/constants";
import type { AgencyGenerationMode } from "@/lib/testing/constants";
import { resolveOrCreateTestAuthUser } from "@/lib/testing/test-email.server";
import { fakePerson } from "@/lib/testing/fake-data";
import { seedArtistScenario } from "@/lib/testing/scenarios/artist";
import { seedFanScenario } from "@/lib/testing/scenarios/fan";
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
  logServiceRoleClientVerification,
} from "@/lib/testing/log-auth-create-user";

export type CreatedTestUser = {
  userId: string;
  email: string;
  username: string;
  displayName: string;
  role: TestUserType;
  scenario: TestScenarioSlug;
  steps: string[];
};

export async function createTestUser(input: {
  type: TestUserType;
  scenario: TestScenarioSlug;
  createdBy: string;
  seed?: number;
  generationMode?: AgencyGenerationMode;
  roleLabel?: string;
}): Promise<CreatedTestUser> {
  const log = createTestCreationLog();
  const admin = getSupabaseAdmin();
  const seed = input.seed ?? Date.now() % 100000;
  const generationMode = input.generationMode ?? "repair";
  const roleLabel = input.roleLabel ?? input.type;
  const person = fakePerson(seed, roleLabel);
  const location = fakeLocation(seed);
  const password = `Test!${seed}Lc`;

  logTestStep(log, "Step 1: Resolving auth user...");
  logServiceRoleClientVerification(admin);

  const authPayload = buildAuthCreateUserLogPayload({
    email: generationMode === "fresh" ? "(fresh unique email)" : person.email,
    type: input.type,
    person,
  });
  console.log("[Testing Center] auth.admin.createUser request payload:", authPayload);

  const authUser = await resolveOrCreateTestAuthUser(admin, {
    mode: generationMode,
    roleLabel,
    displayName: person.displayName,
    password,
    userMetadata: {
      full_name: person.displayName,
      username: person.username,
      intended_role: input.type,
      is_test_account: true,
    },
    log,
    stableKey:
      generationMode === "repair" ? `${input.type}:${input.scenario}:${seed}:${roleLabel}` : undefined,
  });

  console.log("[Testing Center] auth user resolved:", {
    userId: authUser.userId,
    email: authUser.email,
    intendedRole: input.type,
    reused: authUser.reused,
  });

  const userId = authUser.userId;

  logTestStep(log, "Step 2: Verifying profile from signup trigger...");
  const profile = requireDbResult<{ id: string; role: string; username: string | null }>(
    log,
    "Step 2: Verifying profile from signup trigger",
    await admin
      .from("profiles")
      .select("id, role, username")
      .eq("id", userId)
      .maybeSingle(),
    { requireRows: true, emptyMessage: "Profile row was not created by signup trigger" }
  );

  if (input.type === "artist" && profile.role !== "artist") {
    throw new TestCreationStepError(
      "Step 2: Verifying profile from signup trigger",
      {
        message: `Expected profile role "artist" but found "${profile.role}". Signup trigger may not have applied intended_role.`,
      },
      log.steps
    );
  }

  logTestStep(
    log,
    input.type === "artist"
      ? "Step 3: Setting profile role to artist and test flags..."
      : "Step 3: Setting profile role to fan and test flags..."
  );
  const profileUpdate = await admin
    .from("profiles")
    .update({
      display_name: person.displayName,
      username: authUser.username,
      avatar_url: fakeAvatar(seed),
      bio: fakeBio(input.type, seed, input.type === "artist" ? resolveArtistCategory(input.scenario) : undefined),
      role: input.type,
      onboarding_completed: input.scenario !== "brand_new_fan" && input.scenario !== "brand_new_artist",
      is_test_account: true,
      test_scenario: input.scenario,
      test_created_by: input.createdBy,
      test_created_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id, role")
    .maybeSingle();

  const updatedProfile = requireDbResult(log, "Step 3: Setting profile role and test flags", profileUpdate, {
    requireRows: true,
    emptyMessage: "Profile update returned no rows — check RLS or protect_test_account_flags trigger",
  });

  if (input.type === "artist" && updatedProfile.role !== "artist") {
    throw new TestCreationStepError(
      "Step 3: Setting profile role to artist",
      {
        message: `Profile role is "${updatedProfile.role}" after update; artist-only steps cannot proceed`,
      },
      log.steps
    );
  }

  if (input.type === "artist") {
    await ensureArtistProfile(admin, log, userId, person.username, seed, input.scenario as ArtistScenarioSlug);
  }

  logTestStep(log, "Step 6: Seeding location on profile...");
  await seedLocationOnProfile(admin, log, userId, location.city, location.state, location.country);

  if (input.type === "fan") {
    logTestStep(log, "Step 7: Seeding fan scenario...");
    await seedFanScenario(admin, log, userId, input.scenario as FanScenarioSlug, seed, location);
  } else {
    logTestStep(log, "Step 7: Seeding artist scenario...");
    await seedArtistScenario(admin, log, userId, input.scenario as ArtistScenarioSlug, seed);
  }

  logTestStep(log, "Step 8: Complete.");

  return {
    userId,
    email: authUser.email,
    username: authUser.username,
    displayName: person.displayName,
    role: input.type,
    scenario: input.scenario,
    steps: log.steps,
  };
}

async function ensureArtistProfile(
  admin: SupabaseClient,
  log: TestCreationLog,
  userId: string,
  username: string,
  seed: number,
  scenario: ArtistScenarioSlug
) {
  logTestStep(log, "Step 4: Verifying artist row from signup trigger...");
  let artist = requireDbResult<{ id: string; slug: string; user_id: string } | null>(
    log,
    "Step 4: Verifying artist row from signup trigger",
    await admin.from("artists").select("id, slug, user_id").eq("user_id", userId).maybeSingle()
  );

  if (!artist?.id) {
    logTestStep(log, "Step 4b: Creating artist profile (signup trigger did not create row)...");
    const stageName = fakeStageName(seed);
    const { error: rpcError } = await admin.rpc("create_artist_for_user", {
      p_user_id: userId,
      p_stage_name: stageName,
      p_username: username,
    });
    if (rpcError) {
      throwDbError(log, "Step 4b: Creating artist profile", rpcError);
    }

    artist = requireDbResult<{ id: string; slug: string; user_id: string }>(
      log,
      "Step 4b: Creating artist profile",
      await admin.from("artists").select("id, slug, user_id").eq("user_id", userId).maybeSingle(),
      { requireRows: true, emptyMessage: "Artist row still missing after create_artist_for_user RPC" }
    );
  }

  logTestStep(log, "Step 5: Updating artist profile...");
  const stageName = fakeStageName(seed);
  const artistUpdate = await admin
    .from("artists")
    .update({
      stage_name: stageName,
      category: resolveArtistCategory(scenario) ?? "music",
      short_bio: fakeBio("artist", seed, resolveArtistCategory(scenario)),
      social_links: fakeSocialLinks(seed),
      follower_count: 0,
    })
    .eq("user_id", userId)
    .select("id, slug, stage_name")
    .maybeSingle();

  requireDbResult(log, "Step 5: Updating artist profile", artistUpdate, {
    requireRows: true,
    emptyMessage: "Artist update returned no rows — artist row may be missing or blocked by RLS",
  });
}

function resolveArtistCategory(scenario: TestScenarioSlug): string | undefined {
  switch (scenario) {
    case "comedian":
    case "magician":
    case "podcast_host":
    case "motivational_speaker":
      return "comedy";
    case "dj":
    case "musician":
      return "music";
    default:
      return "music";
  }
}

async function seedLocationOnProfile(
  admin: SupabaseClient,
  log: TestCreationLog,
  userId: string,
  cityName: string,
  stateCode: string | null,
  countryCode: string
) {
  const { data: country, error: countryError } = await admin
    .from("countries")
    .select("id")
    .eq("code", countryCode)
    .maybeSingle();
  if (countryError) {
    throwDbError(log, "Step 6: Seeding location on profile — countries lookup", countryError);
  }
  if (!country?.id) {
    logTestStep(log, "Step 6: Seeding location on profile — skipped (country not found)");
    return;
  }

  let stateId: string | null = null;
  if (stateCode) {
    const { data: state, error: stateError } = await admin
      .from("states")
      .select("id")
      .eq("country_id", country.id)
      .eq("code", stateCode)
      .maybeSingle();
    if (stateError) {
      throwDbError(log, "Step 6: Seeding location on profile — states lookup", stateError);
    }
    stateId = (state?.id as string) ?? null;
  }

  let cityId: string | null = null;
  if (stateId) {
    const { data: city, error: cityError } = await admin
      .from("cities")
      .select("id")
      .eq("state_id", stateId)
      .ilike("name", cityName)
      .maybeSingle();
    if (cityError) {
      throwDbError(log, "Step 6: Seeding location on profile — cities lookup", cityError);
    }
    cityId = (city?.id as string) ?? null;
  }

  const locationUpdate = await admin
    .from("profiles")
    .update({ country_id: country.id, state_id: stateId, city_id: cityId })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  requireDbResult(log, "Step 6: Seeding location on profile", locationUpdate, {
    requireRows: true,
    emptyMessage: "Location update returned no rows",
  });
}

export async function deleteTestUser(userId: string) {
  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_test_account")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.is_test_account) throw new Error("Only test accounts can be deleted from Testing Center");
  await admin.auth.admin.deleteUser(userId);
}

export async function resetTestUser(userId: string, createdBy: string) {
  const admin = getSupabaseAdmin();
  const log = createTestCreationLog();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_test_account, test_scenario, role")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.is_test_account || !profile.test_scenario) {
    throw new Error("Not a test account");
  }

  await clearTestUserData(admin, userId);

  const scenario = profile.test_scenario as TestScenarioSlug;
  const seed = Date.now() % 100000;
  if (profile.role === "fan") {
    await seedFanScenario(admin, log, userId, scenario as FanScenarioSlug, seed, fakeLocation(seed));
  } else if (profile.role === "artist") {
    await seedArtistScenario(admin, log, userId, scenario as ArtistScenarioSlug, seed);
  }

  const resetUpdate = await admin
    .from("profiles")
    .update({ test_created_by: createdBy, test_created_at: new Date().toISOString() })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  requireDbResult(log, "Reset test user — profile timestamp update", resetUpdate, {
    requireRows: true,
    emptyMessage: "Failed to update test user reset timestamp",
  });
}

async function clearTestUserData(admin: SupabaseClient, userId: string) {
  const tables = [
    "fan_passport_user_achievements",
    "fan_passport_stamps",
    "fan_passports",
    "notifications",
    "tickets",
    "followers",
    "chat_messages",
    "reactions",
  ] as const;

  for (const table of tables) {
    const col = table === "followers" ? "fan_id" : "user_id";
    await admin.from(table).delete().eq(col, userId);
  }

  const { data: artist } = await admin.from("artists").select("id").eq("user_id", userId).maybeSingle();
  if (artist?.id) {
    await admin.from("tours").delete().eq("artist_id", artist.id);
    await admin.from("followers").delete().eq("artist_id", artist.id);
    await admin.from("products").delete().eq("artist_id", artist.id);
  }
}

export async function deleteAllTestUsers() {
  const admin = getSupabaseAdmin();
  const { data: rows } = await admin.from("profiles").select("id").eq("is_test_account", true);
  for (const row of rows ?? []) {
    await admin.auth.admin.deleteUser(row.id as string);
  }
  return (rows ?? []).length;
}
