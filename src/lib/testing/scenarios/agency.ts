import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyMemberRole } from "@/lib/agency/types";
import { logTestStep, throwDbError, type TestCreationLog } from "@/lib/testing/step-errors";

export type AgencyScenarioSlug = "boutique_agency" | "mid_size_agency" | "enterprise_agency";

export const AGENCY_SCENARIOS: {
  slug: AgencyScenarioSlug;
  label: string;
  description: string;
  artistCount: number;
  plan: "starter" | "pro" | "enterprise";
}[] = [
  {
    slug: "boutique_agency",
    label: "Boutique Agency",
    description: "Starter plan with 5 artists and basic booking history.",
    artistCount: 5,
    plan: "starter",
  },
  {
    slug: "mid_size_agency",
    label: "Mid-Size Agency",
    description: "Pro plan with 25 artists, team members, and revenue data.",
    artistCount: 25,
    plan: "pro",
  },
  {
    slug: "enterprise_agency",
    label: "Enterprise Agency",
    description: "Enterprise plan with 50 artists and full analytics seed.",
    artistCount: 50,
    plan: "enterprise",
  },
];

export const AGENCY_TEAM_ROLES: AgencyMemberRole[] = [
  "owner",
  "admin",
  "booking_manager",
  "artist_manager",
  "assistant",
  "finance",
  "marketing",
];

export async function seedAgencyScenario(
  admin: SupabaseClient,
  log: TestCreationLog,
  orgId: string,
  ownerUserId: string,
  scenario: AgencyScenarioSlug,
  seed: number
) {
  const config = AGENCY_SCENARIOS.find((s) => s.slug === scenario) ?? AGENCY_SCENARIOS[0]!;

  logTestStep(log, `Step A: Loading artists for agency roster (${config.artistCount})...`);
  const { data: testProfiles } = await admin
    .from("profiles")
    .select("id, artists(id, category)")
    .eq("is_test_account", true)
    .eq("role", "artist")
    .limit(config.artistCount * 2);

  const artistPool = (testProfiles ?? [])
    .map((p) => {
      const artists = p.artists as { id: string; category: string } | { id: string; category: string }[] | null;
      const artist = Array.isArray(artists) ? artists[0] : artists;
      return artist ? { id: artist.id, category: artist.category } : null;
    })
    .filter(Boolean)
    .slice(0, config.artistCount) as { id: string; category: string }[];

  if (!artistPool.length) {
    const { data: fallbackArtists, error: artistsError } = await admin
      .from("artists")
      .select("id, category")
      .limit(config.artistCount);

    if (artistsError) throwDbError(log, "Step A: Load artists for roster", artistsError);
    artistPool.push(...((fallbackArtists ?? []) as { id: string; category: string }[]));
  }
  if (!artistPool.length) {
    logTestStep(log, "Step A: Skipped roster — no test artists available");
    return;
  }

  logTestStep(log, "Step B: Seeding managed artists...");
  const rosterRows = artistPool.map((a, i) => ({
    organization_id: orgId,
    artist_id: a.id as string,
    status: i % 7 === 0 ? "pending" : "active",
    genres: [a.category as string],
    approved_at: i % 7 === 0 ? null : new Date().toISOString(),
    invited_at: new Date(Date.now() - i * 86400000).toISOString(),
  }));

  const { error: rosterError } = await admin.from("agency_managed_artists").upsert(rosterRows, {
    onConflict: "organization_id,artist_id",
    ignoreDuplicates: true,
  });
  if (rosterError) throwDbError(log, "Step B: Seed managed artists", rosterError);

  logTestStep(log, "Step C: Seeding booking request...");
  const artistIds = artistPool.map((a) => a.id as string);
  const { data: bookingRequest, error: bookingError } = await admin
    .from("agency_booking_requests")
    .insert({
      organization_id: orgId,
      created_by: ownerUserId,
      title: `${config.label} spring tour`,
      status: "matched",
      artist_ids: artistIds.slice(0, Math.min(10, artistIds.length)),
      preferred_states: ["CA", "NY", "TX"],
      preferred_genres: ["music", "comedy"],
      is_bulk: artistIds.length > 1,
      metadata: { test: true, seed },
    })
    .select("id")
    .single();

  if (bookingError) throwDbError(log, "Step C: Seed booking request", bookingError);

  logTestStep(log, "Step D: Seeding calendar events...");
  for (let i = 0; i < Math.min(5, artistIds.length); i++) {
    const { error: calError } = await admin.from("agency_calendar_events").insert({
      organization_id: orgId,
      artist_id: artistIds[i],
      title: `Test performance ${i + 1}`,
      starts_at: new Date(Date.now() + (i + 3) * 86400000).toISOString(),
      ends_at: new Date(Date.now() + (i + 3) * 86400000 + 7200000).toISOString(),
      color: "#6366f1",
      notes: "Test calendar event",
    });
    if (calError) throwDbError(log, `Step D: Calendar event ${i + 1}`, calError);
  }

  if (bookingRequest?.id) {
    logTestStep(log, "Step E: Seeding booking matches...");
    const { data: venues } = await admin.from("venues").select("id, name, slug").limit(3);
    for (let i = 0; i < Math.min(3, artistIds.length); i++) {
      const venue = venues?.[i % (venues?.length ?? 1)];
      if (!venue) break;
      const { error: matchError } = await admin.from("agency_booking_matches").insert({
        booking_request_id: bookingRequest.id,
        artist_id: artistIds[i],
        venue_id: venue.id,
        match_score: 85 - i * 5,
        status: i === 0 ? "accepted" : "recommended",
        recommendation: {
          venueName: venue.name,
          venueSlug: venue.slug,
          test: true,
        },
      });
      if (matchError) throwDbError(log, `Step E: Booking match ${i + 1}`, matchError);
    }
  }

  logTestStep(log, "Step F: Seeding agency conversation...");
  const { data: conversation, error: convError } = await admin
    .from("agency_conversations")
    .insert({
      organization_id: orgId,
      subject: "Roster coordination",
      participant_type: "team",
      created_by: ownerUserId,
    })
    .select("id")
    .single();

  if (convError) throwDbError(log, "Step F: Seed conversation", convError);

  if (conversation?.id) {
    const { error: msgError } = await admin.from("agency_messages").insert({
      conversation_id: conversation.id,
      sender_id: ownerUserId,
      body: "Test agency thread — schedule confirmed for next week.",
    });
    if (msgError) throwDbError(log, "Step F: Seed message", msgError);
  }

  logTestStep(log, "Agency scenario seed complete");
}
