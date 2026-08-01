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
  "marketing",
  "finance",
  "assistant",
];

type TeamMember = { userId: string; role: AgencyMemberRole };

export async function seedAgencyScenario(
  admin: SupabaseClient,
  log: TestCreationLog,
  orgId: string,
  ownerUserId: string,
  scenario: AgencyScenarioSlug,
  seed: number,
  options?: { teamUserIds?: TeamMember[] }
) {
  const config = AGENCY_SCENARIOS.find((s) => s.slug === scenario) ?? AGENCY_SCENARIOS[0]!;
  const team = options?.teamUserIds ?? [];
  const bookingManager = team.find((t) => t.role === "booking_manager")?.userId ?? ownerUserId;
  const artistManager = team.find((t) => t.role === "artist_manager")?.userId ?? ownerUserId;

  logTestStep(log, `Step A: Loading artists for roster (${config.artistCount})...`);
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
      .select("id, category, stage_name")
      .limit(config.artistCount);
    if (artistsError) throwDbError(log, "Step A: Load artists for roster", artistsError);
    artistPool.push(...((fallbackArtists ?? []) as { id: string; category: string }[]));
  }

  if (!artistPool.length) {
    logTestStep(log, "Step A: Skipped roster — no artists in database");
    return;
  }

  logTestStep(log, "Step B: Seeding managed artists with manager assignments...");
  const rosterRows = artistPool.map((a, i) => ({
    organization_id: orgId,
    artist_id: a.id as string,
    status: i % 7 === 0 ? "pending" : "active",
    genres: [a.category as string],
    assigned_manager_id: i % 2 === 0 ? artistManager : bookingManager,
    assigned_assistant_id: team.find((t) => t.role === "assistant")?.userId ?? null,
    approved_at: i % 7 === 0 ? null : new Date().toISOString(),
    invited_at: new Date(Date.now() - i * 86400000).toISOString(),
  }));

  const { error: rosterError } = await admin.from("agency_managed_artists").upsert(rosterRows, {
    onConflict: "organization_id,artist_id",
    ignoreDuplicates: true,
  });
  if (rosterError) throwDbError(log, "Step B: Seed managed artists", rosterError);

  const artistIds = artistPool.map((a) => a.id as string);

  logTestStep(log, "Step C: Seeding booking requests and matches...");
  const { data: bookingRequest, error: bookingError } = await admin
    .from("agency_booking_requests")
    .insert({
      organization_id: orgId,
      created_by: ownerUserId,
      title: `${config.label} spring tour`,
      status: "matched",
      artist_ids: artistIds.slice(0, Math.min(10, artistIds.length)),
      preferred_states: ["CA", "NY", "TX", "FL"],
      preferred_genres: ["music", "comedy"],
      is_bulk: artistIds.length > 1,
      metadata: { test: true, seed },
    })
    .select("id")
    .single();
  if (bookingError) throwDbError(log, "Step C: Seed booking request", bookingError);

  const { data: venues } = await admin.from("venues").select("id, name, slug, state_code").limit(5);
  if (bookingRequest?.id) {
    for (let i = 0; i < Math.min(5, artistIds.length); i++) {
      const venue = venues?.[i % (venues?.length ?? 1)];
      if (!venue) break;
      await admin.from("agency_booking_matches").insert({
        booking_request_id: bookingRequest.id,
        artist_id: artistIds[i],
        venue_id: venue.id,
        match_score: 88 - i * 4,
        status: i === 0 ? "accepted" : "recommended",
        recommendation: { venueName: venue.name, venueSlug: venue.slug, test: true },
      });
    }
  }

  logTestStep(log, "Step D: Seeding calendar and background jobs...");
  for (let i = 0; i < Math.min(8, artistIds.length); i++) {
    await admin.from("agency_calendar_events").insert({
      organization_id: orgId,
      artist_id: artistIds[i],
      title: `Performance ${i + 1}`,
      starts_at: new Date(Date.now() + (i + 2) * 86400000).toISOString(),
      ends_at: new Date(Date.now() + (i + 2) * 86400000 + 7200000).toISOString(),
      color: i % 2 === 0 ? "#6366f1" : "#10b981",
      notes: "Seeded calendar event",
    });
  }

  await admin.from("agency_background_jobs").insert({
    organization_id: orgId,
    created_by: ownerUserId,
    job_type: "bulk_booking",
    status: "completed",
    payload: { title: `${config.label} bulk`, artistIds: artistIds.slice(0, 3), runAutoMatch: true },
    result: { artistsProcessed: Math.min(3, artistIds.length), test: true },
    progress: 6,
    total_steps: 6,
    is_test: true,
    completed_at: new Date().toISOString(),
  });

  logTestStep(log, "Step E: Seeding revenue (orders + tickets)...");
  const { data: events } = await admin
    .from("events")
    .select("id, artist_id, title, tour_state_code")
    .in("artist_id", artistIds.slice(0, 10))
    .limit(10);

  for (let i = 0; i < Math.min(6, events?.length ?? 0); i++) {
    const event = events![i]!;
    const price = 2500 + (i * 500);
    await admin.from("orders").insert({
      user_id: ownerUserId,
      status: "paid",
      total_cents: price,
      metadata: { test: true, kind: i % 3 === 0 ? "merch" : "ticket", artist_id: event.artist_id, agency_org_id: orgId },
    });
    await admin.from("tickets").upsert(
      {
        event_id: event.id,
        user_id: ownerUserId,
        tier: "general",
        price_cents: price,
        checked_in_at: new Date(Date.now() - i * 86400000).toISOString(),
      },
      { onConflict: "event_id,user_id,tier", ignoreDuplicates: true }
    );
  }

  logTestStep(log, "Step F: Seeding sponsorship proposals...");
  const slot = venues?.[0];
  await admin.from("agency_sponsorship_proposals").insert({
    organization_id: orgId,
    created_by: ownerUserId,
    artist_id: artistIds[0] ?? null,
    venue_id: slot?.id ?? null,
    title: `${config.label} naming package`,
    description: "Test sponsorship proposal for agency dashboard QA.",
    budget_cents: config.plan === "enterprise" ? 25000000 : config.plan === "pro" ? 5000000 : 500000,
    status: "submitted",
    submitted_at: new Date().toISOString(),
    metadata: { test: true },
  });

  logTestStep(log, "Step G: Seeding communications...");
  const { data: conversation } = await admin
    .from("agency_conversations")
    .insert({
      organization_id: orgId,
      subject: "Roster coordination",
      participant_type: "team",
      created_by: ownerUserId,
    })
    .select("id")
    .single();

  if (conversation?.id) {
    await admin.from("agency_messages").insert({
      conversation_id: conversation.id,
      sender_id: ownerUserId,
      body: "Weekly roster sync — all markets confirmed.",
    });
  }

  logTestStep(log, "Agency scenario seed complete");
}
