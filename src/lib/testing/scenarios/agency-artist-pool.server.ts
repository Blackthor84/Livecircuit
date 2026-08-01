import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArtistScenarioSlug } from "@/lib/testing/constants";
import type { AgencyGenerationMode } from "@/lib/testing/constants";
import { createTestUser } from "@/lib/testing/create-user";
import { logTestStep, throwDbError, throwParsedError, type TestCreationLog } from "@/lib/testing/step-errors";

export type AgencyArtistPoolEntry = { id: string; category: string };

const POOL_SCENARIOS: ArtistScenarioSlug[] = [
  "musician",
  "comedian",
  "dj",
  "emerging_artist",
  "growing_artist",
  "magician",
  "podcast_host",
];

function pickArtistScenario(seed: number, index: number): ArtistScenarioSlug {
  return POOL_SCENARIOS[(seed + index) % POOL_SCENARIOS.length]!;
}

function mapProfileArtists(
  profiles: { id: string; artists: { id: string; category: string } | { id: string; category: string }[] | null }[]
): AgencyArtistPoolEntry[] {
  const entries: AgencyArtistPoolEntry[] = [];
  for (const profile of profiles) {
    const artists = profile.artists;
    const artist = Array.isArray(artists) ? artists[0] : artists;
    if (artist?.id) {
      entries.push({ id: artist.id, category: artist.category ?? "music" });
    }
  }
  return entries;
}

async function loadRosterArtists(
  admin: SupabaseClient,
  orgId: string
): Promise<AgencyArtistPoolEntry[]> {
  const { data, error } = await admin
    .from("agency_managed_artists")
    .select("artist_id, artists(id, category)")
    .eq("organization_id", orgId);

  if (error) return [];

  return (data ?? [])
    .map((row) => {
      const artists = row.artists as { id: string; category: string } | { id: string; category: string }[] | null;
      const artist = Array.isArray(artists) ? artists[0] : artists;
      return artist ? { id: artist.id, category: artist.category ?? "music" } : null;
    })
    .filter(Boolean) as AgencyArtistPoolEntry[];
}

async function loadAvailableArtists(
  admin: SupabaseClient,
  limit: number,
  excludeIds: Set<string>
): Promise<AgencyArtistPoolEntry[]> {
  const pool: AgencyArtistPoolEntry[] = [];

  const { data: testProfiles, error: testError } = await admin
    .from("profiles")
    .select("id, artists(id, category)")
    .eq("is_test_account", true)
    .eq("role", "artist")
    .limit(limit * 3);

  if (testError) throw testError;

  for (const entry of mapProfileArtists(testProfiles ?? [])) {
    if (!excludeIds.has(entry.id)) {
      pool.push(entry);
      excludeIds.add(entry.id);
      if (pool.length >= limit) return pool;
    }
  }

  const { data: fallbackArtists, error: artistsError } = await admin
    .from("artists")
    .select("id, category")
    .limit(limit * 3);

  if (artistsError) throw artistsError;

  for (const artist of fallbackArtists ?? []) {
    const id = artist.id as string;
    if (!excludeIds.has(id)) {
      pool.push({ id, category: (artist.category as string) ?? "music" });
      excludeIds.add(id);
      if (pool.length >= limit) break;
    }
  }

  return pool;
}

async function generateArtistAccounts(
  admin: SupabaseClient,
  log: TestCreationLog,
  input: {
    count: number;
    createdBy: string;
    seed: number;
    generationMode: AgencyGenerationMode;
  }
): Promise<AgencyArtistPoolEntry[]> {
  const generated: AgencyArtistPoolEntry[] = [];

  for (let i = 0; i < input.count; i++) {
    const scenario = pickArtistScenario(input.seed, i);
    logTestStep(
      log,
      `Generating artist account ${i + 1}/${input.count} (${scenario})...`
    );

    const created = await createTestUser({
      type: "artist",
      scenario,
      createdBy: input.createdBy,
      seed: input.seed + i + 5000,
      generationMode: input.generationMode,
      roleLabel: `agency_artist_${i + 1}`,
    });

    const { data: artist, error } = await admin
      .from("artists")
      .select("id, category")
      .eq("user_id", created.userId)
      .maybeSingle();

    if (error) throwDbError(log, `Load generated artist ${i + 1}`, error);
    if (!artist?.id) {
      throwParsedError(
        log,
        `Generated artist profile ${i + 1}`,
        new Error("Artist row missing after createTestUser"),
        "Artist row missing after createTestUser"
      );
    }

    generated.push({
      id: artist.id as string,
      category: (artist.category as string) ?? "music",
    });
  }

  return generated;
}

/**
 * Ensures at least `requiredCount` artists are available for roster assignment.
 * Creates test artist accounts when the database pool is insufficient.
 */
export async function ensureAgencyArtistPool(
  admin: SupabaseClient,
  log: TestCreationLog,
  input: {
    orgId: string;
    requiredCount: number;
    createdBy: string;
    seed: number;
    generationMode?: AgencyGenerationMode;
  }
): Promise<{ artists: AgencyArtistPoolEntry[]; generatedCount: number }> {
  const generationMode = input.generationMode ?? "repair";
  const rosterArtists = await loadRosterArtists(admin, input.orgId);
  const excludeIds = new Set(rosterArtists.map((a) => a.id));

  if (rosterArtists.length >= input.requiredCount) {
    logTestStep(
      log,
      `Artist pool ready — ${rosterArtists.length} artists already on roster`
    );
    return { artists: rosterArtists.slice(0, input.requiredCount), generatedCount: 0 };
  }

  const deficit = input.requiredCount - rosterArtists.length;
  logTestStep(
    log,
    `Artist pool needs ${deficit} more artist(s) (roster ${rosterArtists.length}/${input.requiredCount})...`
  );

  const available = await loadAvailableArtists(admin, deficit, excludeIds);
  let generatedCount = 0;

  if (available.length < deficit) {
    const toGenerate = deficit - available.length;
    logTestStep(
      log,
      `Creating ${toGenerate} test artist account(s) — pool had ${available.length} available`
    );
    const generated = await generateArtistAccounts(admin, log, {
      count: toGenerate,
      createdBy: input.createdBy,
      seed: input.seed,
      generationMode,
    });
    generatedCount = generated.length;
    available.push(...generated);
  }

  const artists = [...rosterArtists, ...available].slice(0, input.requiredCount);

  if (!artists.length) {
    throwParsedError(
      log,
      "Ensure artist pool",
      new Error("Failed to provision artists for agency roster"),
      "Failed to provision artists for agency roster"
    );
  }

  logTestStep(
    log,
    `Artist pool ready — ${artists.length} artist(s) (${generatedCount} newly generated)`
  );

  return { artists, generatedCount };
}
