import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyMemberRole } from "@/lib/agency/types";
import { getAgencyOrgTemplate, type AgencyScenarioSlug } from "@/lib/agency";
import { ensureAgencyDashboardSettings } from "@/lib/agency/server";
import { logTestStep, throwDbError, type TestCreationLog } from "@/lib/testing/step-errors";

type TeamMember = { userId: string; role: AgencyMemberRole };

const BOOKING_STATUSES = ["draft", "pending", "matched", "approved"] as const;
const BOOKING_TITLES = [
  "Spring tour routing",
  "Festival season outreach",
  "Corporate event pipeline",
  "College circuit bookings",
  "Holiday market push",
  "West coast expansion",
  "East coast residency",
  "International routing",
];

async function seedNotifications(
  admin: SupabaseClient,
  userIds: string[],
  orgName: string
) {
  const titles = [
    { type: "system" as const, title: `${orgName}: roster sync complete`, body: "Weekly roster review finished." },
    { type: "system" as const, title: "New booking match available", body: "3 venues matched your latest request." },
    { type: "ticket_reminder" as const, title: "Ticket sales milestone", body: "Agency revenue crossed this week's target." },
    { type: "system" as const, title: "Team invitation accepted", body: "A booking manager joined your organization." },
  ];

  for (const userId of userIds.slice(0, 5)) {
    for (let i = 0; i < titles.length; i++) {
      const n = titles[i]!;
      await admin.from("notifications").insert({
        user_id: userId,
        type: n.type,
        title: n.title,
        body: n.body,
        link: "/agency/dashboard",
        metadata: { test: true, agency: true },
        read_at: i % 2 === 0 ? new Date().toISOString() : null,
      });
    }
  }
}

export async function seedAgencyScenario(
  admin: SupabaseClient,
  log: TestCreationLog,
  orgId: string,
  ownerUserId: string,
  scenario: AgencyScenarioSlug,
  seed: number,
  options?: { teamUserIds?: TeamMember[]; skipIfPopulated?: boolean }
) {
  const template = getAgencyOrgTemplate(scenario);
  const team = options?.teamUserIds ?? [];
  const bookingManager = team.find((t) => t.role === "booking_manager")?.userId ?? ownerUserId;
  const artistManager = team.find((t) => t.role === "artist_manager")?.userId ?? ownerUserId;

  if (options?.skipIfPopulated) {
    const { count } = await admin
      .from("agency_managed_artists")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId);
    if ((count ?? 0) >= Math.min(3, template.artistCount)) {
      logTestStep(log, "Scenario seed skipped — roster already populated");
      await ensureAgencyDashboardSettings(admin, orgId, scenario);
      return;
    }
  }

  logTestStep(log, `Step A: Loading artists for roster (${template.artistCount})...`);
  const { data: testProfiles } = await admin
    .from("profiles")
    .select("id, artists(id, category)")
    .eq("is_test_account", true)
    .eq("role", "artist")
    .limit(template.artistCount * 2);

  const artistPool = (testProfiles ?? [])
    .map((p) => {
      const artists = p.artists as { id: string; category: string } | { id: string; category: string }[] | null;
      const artist = Array.isArray(artists) ? artists[0] : artists;
      return artist ? { id: artist.id, category: artist.category } : null;
    })
    .filter(Boolean)
    .slice(0, template.artistCount) as { id: string; category: string }[];

  if (!artistPool.length) {
    const { data: fallbackArtists, error: artistsError } = await admin
      .from("artists")
      .select("id, category, stage_name")
      .limit(template.artistCount);
    if (artistsError) throwDbError(log, "Step A: Load artists for roster", artistsError);
    artistPool.push(...((fallbackArtists ?? []) as { id: string; category: string }[]));
  }

  if (!artistPool.length) {
    logTestStep(log, "Step A: Skipped roster — no artists in database");
    await ensureAgencyDashboardSettings(admin, orgId, scenario);
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

  logTestStep(log, `Step C: Seeding booking requests (${template.bookingCount})...`);
  const { data: venues } = await admin.from("venues").select("id, name, slug, state_code").limit(20);

  const bookingBatchSize = Math.min(template.bookingCount, 100);
  for (let b = 0; b < bookingBatchSize; b++) {
    const status = BOOKING_STATUSES[b % BOOKING_STATUSES.length]!;
    const title = `${BOOKING_TITLES[b % BOOKING_TITLES.length]!} #${b + 1}`;
    const sliceStart = (b * 3) % Math.max(1, artistIds.length);
    const batchArtistIds = artistIds.slice(sliceStart, sliceStart + Math.min(10, artistIds.length));

    const { data: bookingRequest, error: bookingError } = await admin
      .from("agency_booking_requests")
      .insert({
        organization_id: orgId,
        created_by: b % 3 === 0 ? bookingManager : ownerUserId,
        title,
        status,
        artist_ids: batchArtistIds.length ? batchArtistIds : artistIds.slice(0, 3),
        preferred_states: ["CA", "NY", "TX", "FL", "IL"],
        preferred_genres: ["music", "comedy"],
        is_bulk: batchArtistIds.length > 1,
        metadata: { test: true, seed: seed + b, scenario },
      })
      .select("id")
      .single();

    if (bookingError) {
      if (b === 0) throwDbError(log, "Step C: Seed booking request", bookingError);
      break;
    }

    if (bookingRequest?.id && venues?.length) {
      const matchCount = Math.min(3, batchArtistIds.length);
      for (let i = 0; i < matchCount; i++) {
        const venue = venues[(b + i) % venues.length]!;
        const artistId = batchArtistIds[i];
        if (!artistId) continue;
        await admin.from("agency_booking_matches").insert({
          booking_request_id: bookingRequest.id,
          artist_id: artistId,
          venue_id: venue.id,
          match_score: 92 - (i * 3 + b % 5),
          status: i === 0 ? "accepted" : "recommended",
          recommendation: { venueName: venue.name, venueSlug: venue.slug, test: true },
        });
      }
    }
  }

  logTestStep(log, "Step D: Seeding calendar and background jobs...");
  const calendarCount = Math.min(24, artistIds.length);
  for (let i = 0; i < calendarCount; i++) {
    await admin.from("agency_calendar_events").insert({
      organization_id: orgId,
      artist_id: artistIds[i % artistIds.length],
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
    payload: { title: `${template.label} bulk`, artistIds: artistIds.slice(0, 3), runAutoMatch: true },
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
    .in("artist_id", artistIds.slice(0, Math.min(30, artistIds.length)))
    .limit(30);

  const revenueRows = Math.min(
    template.plan === "enterprise" ? 30 : template.plan === "pro" ? 18 : 10,
    events?.length ?? 0
  );

  for (let i = 0; i < revenueRows; i++) {
    const event = events![i]!;
    const price = 2500 + i * 500;
    await admin.from("orders").insert({
      user_id: ownerUserId,
      status: "paid",
      total_cents: price,
      metadata: {
        test: true,
        kind: i % 3 === 0 ? "merch" : "ticket",
        artist_id: event.artist_id,
        agency_org_id: orgId,
      },
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
  const sponsorCount = template.plan === "enterprise" ? 5 : template.plan === "pro" ? 3 : 2;
  for (let s = 0; s < sponsorCount; s++) {
    const slot = venues?.[s % (venues?.length ?? 1)];
    await admin.from("agency_sponsorship_proposals").insert({
      organization_id: orgId,
      created_by: ownerUserId,
      artist_id: artistIds[s % artistIds.length] ?? null,
      venue_id: slot?.id ?? null,
      title: `${template.label} package ${s + 1}`,
      description: "Test sponsorship proposal for agency dashboard QA.",
      budget_cents:
        template.plan === "enterprise" ? 25000000 : template.plan === "pro" ? 5000000 : 500000,
      status: s === 0 ? "submitted" : "draft",
      submitted_at: s === 0 ? new Date().toISOString() : null,
      metadata: { test: true, scenario },
    });
  }

  logTestStep(log, "Step G: Seeding communications...");
  const conversationSubjects = ["Roster coordination", "Booking pipeline", "Finance review", "Marketing sync"];
  for (const subject of conversationSubjects) {
    const { data: conversation } = await admin
      .from("agency_conversations")
      .insert({
        organization_id: orgId,
        subject,
        participant_type: "team",
        created_by: ownerUserId,
      })
      .select("id")
      .single();

    if (conversation?.id) {
      await admin.from("agency_messages").insert({
        conversation_id: conversation.id,
        sender_id: ownerUserId,
        body: `${subject} — all markets confirmed for ${template.label}.`,
      });
    }
  }

  logTestStep(log, "Step H: Seeding notifications for team...");
  const notifyUserIds = [ownerUserId, ...team.map((t) => t.userId)];
  await seedNotifications(admin, notifyUserIds, template.label);

  logTestStep(log, "Step I: Ensuring dashboard settings...");
  await ensureAgencyDashboardSettings(admin, orgId, scenario);

  logTestStep(log, "Agency scenario seed complete");
}
