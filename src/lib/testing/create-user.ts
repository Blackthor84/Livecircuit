import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fakeAvatar, fakeBio, fakeLocation, fakePerson, fakeSocialLinks, fakeStageName } from "@/lib/testing/fake-data";
import type { ArtistScenarioSlug, FanScenarioSlug, TestScenarioSlug, TestUserType } from "@/lib/testing/constants";
import { seedArtistScenario } from "@/lib/testing/scenarios/artist";
import { seedFanScenario } from "@/lib/testing/scenarios/fan";

export type CreatedTestUser = {
  userId: string;
  email: string;
  username: string;
  displayName: string;
  role: TestUserType;
  scenario: TestScenarioSlug;
};

export async function createTestUser(input: {
  type: TestUserType;
  scenario: TestScenarioSlug;
  createdBy: string;
  seed?: number;
}): Promise<CreatedTestUser> {
  const admin = getSupabaseAdmin();
  const seed = input.seed ?? Date.now() % 100000;
  const person = fakePerson(seed);
  const location = fakeLocation(seed);
  const password = `Test!${seed}Lc`;

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: person.email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: person.displayName,
      username: person.username,
      intended_role: input.type,
      is_test_account: true,
    },
  });

  if (authError || !authData.user) {
    throw new Error(authError?.message ?? "Failed to create auth user");
  }

  const userId = authData.user.id;

  await admin
    .from("profiles")
    .update({
      display_name: person.displayName,
      username: person.username,
      avatar_url: fakeAvatar(seed),
      bio: fakeBio(input.type, seed, input.type === "artist" ? resolveArtistCategory(input.scenario) : undefined),
      role: input.type,
      onboarding_completed: input.scenario !== "brand_new_fan" && input.scenario !== "brand_new_artist",
      is_test_account: true,
      test_scenario: input.scenario,
      test_created_by: input.createdBy,
      test_created_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (input.type === "artist") {
    const stageName = fakeStageName(seed);
    await admin
      .from("artists")
      .update({
        stage_name: stageName,
        category: resolveArtistCategory(input.scenario as ArtistScenarioSlug) ?? "music",
        short_bio: fakeBio("artist", seed, resolveArtistCategory(input.scenario as ArtistScenarioSlug)),
        social_links: fakeSocialLinks(seed),
        follower_count: 0,
      })
      .eq("user_id", userId);
  }

  await seedLocationOnProfile(admin, userId, location.city, location.state, location.country);

  if (input.type === "fan") {
    await seedFanScenario(admin, userId, input.scenario as FanScenarioSlug, seed, location);
  } else {
    await seedArtistScenario(admin, userId, input.scenario as ArtistScenarioSlug, seed);
  }

  return {
    userId,
    email: person.email,
    username: person.username,
    displayName: person.displayName,
    role: input.type,
    scenario: input.scenario,
  };
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
  userId: string,
  cityName: string,
  stateCode: string | null,
  countryCode: string
) {
  const { data: country } = await admin.from("countries").select("id").eq("code", countryCode).maybeSingle();
  if (!country?.id) return;

  let stateId: string | null = null;
  if (stateCode) {
    const { data: state } = await admin
      .from("states")
      .select("id")
      .eq("country_id", country.id)
      .eq("code", stateCode)
      .maybeSingle();
    stateId = (state?.id as string) ?? null;
  }

  let cityId: string | null = null;
  if (stateId) {
    const { data: city } = await admin
      .from("cities")
      .select("id")
      .eq("state_id", stateId)
      .ilike("name", cityName)
      .maybeSingle();
    cityId = (city?.id as string) ?? null;
  }

  await admin
    .from("profiles")
    .update({ country_id: country.id, state_id: stateId, city_id: cityId })
    .eq("id", userId);
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
    await seedFanScenario(admin, userId, scenario as FanScenarioSlug, seed, fakeLocation(seed));
  } else if (profile.role === "artist") {
    await seedArtistScenario(admin, userId, scenario as ArtistScenarioSlug, seed);
  }

  await admin
    .from("profiles")
    .update({ test_created_by: createdBy, test_created_at: new Date().toISOString() })
    .eq("id", userId);
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
