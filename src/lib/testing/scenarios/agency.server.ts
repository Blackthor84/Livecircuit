import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyMemberRole } from "@/lib/agency/types";
import { getAgencyOrgTemplate, type AgencyScenarioSlug } from "@/lib/agency";
import { ensureAgencyDashboardSettings } from "@/lib/agency/server";
import { logTestStep, throwDbError, throwParsedError, type TestCreationLog } from "@/lib/testing/step-errors";
import {
  ensureAgencyArtistPool,
  type AgencyArtistPoolEntry,
} from "@/lib/testing/scenarios/agency-artist-pool.server";

type TeamMember = { userId: string; role: AgencyMemberRole };

export type SeedAgencyOptions = {
  teamUserIds?: TeamMember[];
  /** When true, only seed categories that are empty or below template minimum. */
  fillMissingOnly?: boolean;
  createdBy: string;
};

const BOOKING_STATUSES = ["pending", "approved", "rejected", "matched", "draft", "cancelled"] as const;
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

const CALENDAR_EVENT_TYPES = [
  { type: "show", title: "Upcoming performance" },
  { type: "meeting", title: "Team sync" },
  { type: "deadline", title: "Contract deadline" },
  { type: "tour", title: "Tour leg kickoff" },
  { type: "recurring", title: "Weekly roster review" },
] as const;

const SPONSOR_STATUSES = ["draft", "submitted", "under_review", "accepted", "rejected"] as const;

const GENRE_TAGS = ["music", "comedy", "electronic", "indie", "hip-hop", "country", "jazz", "spoken-word"];

type OrgSeedCounts = {
  roster: number;
  bookings: number;
  calendar: number;
  sponsors: number;
  conversations: number;
  notifications: number;
  orders: number;
};

async function getOrgSeedCounts(admin: SupabaseClient, orgId: string, userId: string): Promise<OrgSeedCounts> {
  const countFor = async (table: string, column: string, value: string) => {
    const { count } = await admin.from(table).select("id", { count: "exact", head: true }).eq(column, value);
    return count ?? 0;
  };

  const { count: orgOrderCount } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .contains("metadata", { agency_org_id: orgId });

  return {
    roster: await countFor("agency_managed_artists", "organization_id", orgId),
    bookings: await countFor("agency_booking_requests", "organization_id", orgId),
    calendar: await countFor("agency_calendar_events", "organization_id", orgId),
    sponsors: await countFor("agency_sponsorship_proposals", "organization_id", orgId),
    conversations: await countFor("agency_conversations", "organization_id", orgId),
    notifications: await countFor("notifications", "user_id", userId),
    orders: orgOrderCount ?? (await countFor("orders", "user_id", userId)),
  };
}

async function seedNotifications(
  admin: SupabaseClient,
  userIds: string[],
  orgName: string,
  fillMissingOnly: boolean
) {
  if (fillMissingOnly) {
    const targets: string[] = [];
    for (const userId of userIds.slice(0, 8)) {
      const { count } = await admin
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if ((count ?? 0) === 0) targets.push(userId);
    }
    if (!targets.length) return;
    userIds = targets;
  }

  const titles = [
    { type: "system" as const, title: `${orgName}: roster sync complete`, body: "Weekly roster review finished." },
    { type: "system" as const, title: "New booking match available", body: "3 venues matched your latest request." },
    { type: "ticket_reminder" as const, title: "Ticket sales milestone", body: "Agency revenue crossed this week's target." },
    { type: "system" as const, title: "Team invitation accepted", body: "A booking manager joined your organization." },
    { type: "system" as const, title: "Calendar reminder", body: "Contract review meeting starts in 1 hour." },
    { type: "system" as const, title: "Sponsor proposal update", body: "A brand partner accepted your latest package." },
    { type: "system" as const, title: "Booking approved", body: "West coast routing request was approved." },
    { type: "system" as const, title: "Revenue report ready", body: "Monthly revenue analytics are available." },
  ];

  for (const userId of userIds.slice(0, 8)) {
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

async function seedAgencyRoster(
  admin: SupabaseClient,
  log: TestCreationLog,
  orgId: string,
  artistPool: AgencyArtistPoolEntry[],
  team: TeamMember[],
  bookingManager: string,
  artistManager: string,
  fillMissingOnly: boolean,
  rosterTarget: number
) {
  const { data: existingRoster } = await admin
    .from("agency_managed_artists")
    .select("artist_id")
    .eq("organization_id", orgId);

  const existingIds = new Set((existingRoster ?? []).map((row) => row.artist_id as string));

  if (fillMissingOnly && existingIds.size >= rosterTarget) {
    logTestStep(log, "Roster already at target — skipping roster seed");
    return [...existingIds];
  }

  const artistsToAssign = fillMissingOnly
    ? artistPool.filter((a) => !existingIds.has(a.id))
    : artistPool;

  if (!artistsToAssign.length && existingIds.size) {
    return [...existingIds];
  }

  logTestStep(
    log,
    `Seeding managed artists with contracts and availability (${artistsToAssign.length})...`
  );

  const now = Date.now();
  const rosterRows = artistsToAssign.map((a, i) => ({
    organization_id: orgId,
    artist_id: a.id,
    status: i % 7 === 0 ? "pending" : "active",
    genres: [a.category, GENRE_TAGS[i % GENRE_TAGS.length]!].filter(Boolean),
    tags: [`${a.category}-live`, `market-${(i % 5) + 1}`],
    assigned_manager_id: i % 2 === 0 ? artistManager : bookingManager,
    assigned_assistant_id: team.find((t) => t.role === "assistant")?.userId ?? null,
    contract_starts_at: new Date(now - (90 + i) * 86400000).toISOString(),
    contract_ends_at: new Date(now + (365 + i * 30) * 86400000).toISOString(),
    approved_at: i % 7 === 0 ? null : new Date().toISOString(),
    invited_at: new Date(now - i * 86400000).toISOString(),
    notes: `Availability: ${i % 3 === 0 ? "Fri–Sun" : i % 3 === 1 ? "Weeknights" : "Flexible"} · Performance history seeded in audit log`,
  }));

  const { error: rosterError } = await admin.from("agency_managed_artists").upsert(rosterRows, {
    onConflict: "organization_id,artist_id",
    ignoreDuplicates: !fillMissingOnly,
  });
  if (rosterError) throwDbError(log, "Seed managed artists", rosterError);

  for (let i = 0; i < Math.min(artistsToAssign.length, 12); i++) {
    await admin.from("agency_action_audit").insert({
      organization_id: orgId,
      actor_user_id: bookingManager,
      artist_id: artistsToAssign[i]!.id,
      action: "performance_logged",
      metadata: {
        test: true,
        venue: ["The Roxy", "Brooklyn Bowl", "Red Rocks", "House of Blues"][i % 4],
        attendance: 900 + i * 75,
        revenue_cents: 450000 + i * 25000,
      },
    });
  }

  return [...existingIds, ...artistsToAssign.map((a) => a.id)];
}

async function ensureArtistEvents(
  admin: SupabaseClient,
  log: TestCreationLog,
  artistIds: string[],
  limit: number
) {
  const { data: existingEvents } = await admin
    .from("events")
    .select("id, artist_id")
    .in("artist_id", artistIds.slice(0, limit))
    .limit(limit);

  const covered = new Set((existingEvents ?? []).map((e) => e.artist_id as string));
  const needsEvents = artistIds.filter((id) => !covered.has(id)).slice(0, Math.min(10, limit));

  for (let i = 0; i < needsEvents.length; i++) {
    const artistId = needsEvents[i]!;
    const { data: artist } = await admin.from("artists").select("id, slug, user_id").eq("id", artistId).maybeSingle();
    if (!artist) continue;

    const slugBase = (artist.slug as string) ?? `artist-${i}`;
    const { data: tour } = await admin
      .from("tours")
      .insert({
        artist_id: artistId,
        title: `Agency QA Tour ${i + 1}`,
        slug: `${slugBase}-agency-qa-${i}`.slice(0, 80),
        description: "Test tour for agency revenue seeding",
        status: "published",
      })
      .select("id")
      .maybeSingle();

    if (!tour?.id) continue;

    const at = new Date(Date.now() - (i + 5) * 7 * 86400000);
    const { data: stop } = await admin
      .from("tour_stops")
      .insert({
        tour_id: tour.id,
        virtual_location_label: `QA Stop ${i + 1}`,
        tour_city: ["Boston", "Austin", "Chicago", "Denver", "Seattle"][i % 5],
        tour_state_code: ["MA", "TX", "IL", "CO", "WA"][i % 5],
        scheduled_at: at.toISOString(),
        show_starts_at: at.toISOString(),
        ticket_price_cents: 3500 + i * 500,
        capacity: 2500,
        stop_order: 1,
      })
      .select("id")
      .maybeSingle();

    if (!stop?.id) continue;

    await admin.from("events").insert({
      tour_stop_id: stop.id,
      artist_id: artistId,
      slug: `${slugBase}-qa-event-${i}`.slice(0, 80),
      title: `QA Performance ${i + 1}`,
      status: "completed",
      scheduled_at: at.toISOString(),
      started_at: at.toISOString(),
      ended_at: new Date(at.getTime() + 7200000).toISOString(),
      viewer_count: 800 + i * 120,
      peak_viewers: 1200 + i * 150,
    });
  }

  if (needsEvents.length) {
    logTestStep(log, `Ensured performance events for ${needsEvents.length} roster artist(s)`);
  }
}

async function seedAgencyBookings(
  admin: SupabaseClient,
  log: TestCreationLog,
  orgId: string,
  ownerUserId: string,
  bookingManager: string,
  artistIds: string[],
  scenario: AgencyScenarioSlug,
  seed: number,
  bookingCount: number
) {
  logTestStep(log, `Seeding booking requests (${bookingCount})...`);
  const { data: venues } = await admin.from("venues").select("id, name, slug, state_code").limit(20);

  const batchSize = Math.min(bookingCount, 100);
  for (let b = 0; b < batchSize; b++) {
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
        is_recurring: b % 11 === 0,
        recurrence_rule: b % 11 === 0 ? "FREQ=WEEKLY;COUNT=8" : null,
        metadata: {
          test: true,
          seed: seed + b,
          scenario,
          lifecycle: status === "matched" ? "completed" : status === "rejected" ? "declined" : status,
        },
      })
      .select("id")
      .single();

    if (bookingError) {
      if (b === 0) throwDbError(log, "Seed booking request", bookingError);
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
          status: status === "rejected" ? "rejected" : i === 0 ? "accepted" : "recommended",
          recommendation: { venueName: venue.name, venueSlug: venue.slug, test: true },
        });
      }
    }
  }
}

async function seedAgencyCalendar(
  admin: SupabaseClient,
  log: TestCreationLog,
  orgId: string,
  artistIds: string[],
  calendarTarget: number
) {
  logTestStep(log, `Seeding calendar events (${calendarTarget})...`);
  for (let i = 0; i < calendarTarget; i++) {
    const eventType = CALENDAR_EVENT_TYPES[i % CALENDAR_EVENT_TYPES.length]!;
    const isPast = i % 5 === 0;
    const dayOffset = isPast ? -(i + 2) : i + 2;
    const startsAt = new Date(Date.now() + dayOffset * 86400000);

    await admin.from("agency_calendar_events").insert({
      organization_id: orgId,
      artist_id: artistIds[i % artistIds.length],
      title: `${eventType.title} ${i + 1}`,
      starts_at: startsAt.toISOString(),
      ends_at: new Date(startsAt.getTime() + (eventType.type === "tour" ? 86400000 * 3 : 7200000)).toISOString(),
      color: i % 2 === 0 ? "#6366f1" : "#10b981",
      notes: `Seeded ${eventType.type} event`,
      metadata: {
        test: true,
        event_type: eventType.type,
        recurring: eventType.type === "recurring",
      },
    });
  }
}

async function seedAgencyRevenue(
  admin: SupabaseClient,
  log: TestCreationLog,
  orgId: string,
  ownerUserId: string,
  artistIds: string[],
  plan: "starter" | "pro" | "enterprise"
) {
  logTestStep(log, "Seeding revenue (orders + tickets)...");
  await ensureArtistEvents(admin, log, artistIds, 30);

  const { data: events } = await admin
    .from("events")
    .select("id, artist_id, title")
    .in("artist_id", artistIds.slice(0, Math.min(30, artistIds.length)))
    .limit(30);

  const revenueRows = Math.min(
    plan === "enterprise" ? 30 : plan === "pro" ? 18 : 10,
    Math.max(events?.length ?? 0, 5)
  );

  for (let i = 0; i < revenueRows; i++) {
    const event = events?.[i];
    const price = 2500 + i * 500;
    await admin.from("orders").insert({
      user_id: ownerUserId,
      status: "paid",
      total_cents: price,
      metadata: {
        test: true,
        kind: i % 3 === 0 ? "merch" : "ticket",
        artist_id: event?.artist_id ?? artistIds[i % artistIds.length],
        agency_org_id: orgId,
      },
    });
    if (event?.id) {
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
  }
}

async function seedAgencySponsorships(
  admin: SupabaseClient,
  log: TestCreationLog,
  orgId: string,
  ownerUserId: string,
  artistIds: string[],
  templateLabel: string,
  scenario: AgencyScenarioSlug,
  plan: "starter" | "pro" | "enterprise",
  sponsorCount: number
) {
  logTestStep(log, `Seeding sponsorship proposals (${sponsorCount})...`);
  const { data: venues } = await admin.from("venues").select("id").limit(10);

  for (let s = 0; s < sponsorCount; s++) {
    const status = SPONSOR_STATUSES[s % SPONSOR_STATUSES.length]!;
    const slot = venues?.[s % (venues?.length ?? 1)];
    await admin.from("agency_sponsorship_proposals").insert({
      organization_id: orgId,
      created_by: ownerUserId,
      artist_id: artistIds[s % artistIds.length] ?? null,
      venue_id: slot?.id ?? null,
      title: `${templateLabel} package ${s + 1}`,
      description: "Test sponsorship proposal for agency dashboard QA.",
      budget_cents:
        plan === "enterprise" ? 25000000 : plan === "pro" ? 5000000 : 500000,
      status,
      submitted_at: status !== "draft" ? new Date(Date.now() - s * 86400000).toISOString() : null,
      metadata: { test: true, scenario, lifecycle: status },
    });
  }
}

async function seedAgencyConversations(
  admin: SupabaseClient,
  log: TestCreationLog,
  orgId: string,
  ownerUserId: string,
  templateLabel: string,
  team: TeamMember[]
) {
  logTestStep(log, "Seeding agency conversations...");
  const conversationSpecs = [
    { subject: "Roster coordination", participant_type: "artist" as const },
    { subject: "Sponsor package review", participant_type: "sponsor" as const },
    { subject: "Venue hold confirmation", participant_type: "venue" as const },
    { subject: "Finance review", participant_type: "team" as const },
    { subject: "Marketing sync", participant_type: "team" as const },
    { subject: "Booking pipeline", participant_type: "team" as const },
  ];

  for (const spec of conversationSpecs) {
    const { data: conversation } = await admin
      .from("agency_conversations")
      .insert({
        organization_id: orgId,
        subject: spec.subject,
        participant_type: spec.participant_type,
        created_by: ownerUserId,
      })
      .select("id")
      .single();

    if (conversation?.id) {
      const senderId = team.find((t) => t.role === "booking_manager")?.userId ?? ownerUserId;
      await admin.from("agency_messages").insert({
        conversation_id: conversation.id,
        sender_id: senderId,
        body: `${spec.subject} — all markets confirmed for ${templateLabel}.`,
      });
      await admin.from("agency_messages").insert({
        conversation_id: conversation.id,
        sender_id: ownerUserId,
        body: "Copy that — updating the calendar and notifying the roster.",
      });
    }
  }
}

async function seedAgencyAnalyticsSnapshot(
  admin: SupabaseClient,
  log: TestCreationLog,
  orgId: string,
  scenario: AgencyScenarioSlug,
  artistIds: string[],
  templateLabel: string,
  plan: "starter" | "pro" | "enterprise"
) {
  logTestStep(log, "Seeding analytics snapshot...");
  const { data: org } = await admin.from("agency_organizations").select("metadata").eq("id", orgId).maybeSingle();
  const metadata = ((org?.metadata ?? {}) as Record<string, unknown>) ?? {};

  if (metadata.analytics_snapshot) return;

  const baseRevenue = plan === "enterprise" ? 125000000 : plan === "pro" ? 45000000 : 8500000;
  const snapshot = {
    revenue_cents: baseRevenue,
    attendance: plan === "enterprise" ? 145000 : plan === "pro" ? 42000 : 8500,
    watch_time_hours: plan === "enterprise" ? 48000 : plan === "pro" ? 12000 : 2400,
    ticket_sales: plan === "enterprise" ? 85000 : plan === "pro" ? 22000 : 4200,
    top_artists: artistIds.slice(0, 5).map((id, i) => ({
      artist_id: id,
      rank: i + 1,
      revenue_cents: Math.round(baseRevenue / (i + 2)),
    })),
    top_genres: GENRE_TAGS.slice(0, 4).map((genre, i) => ({
      genre,
      share_pct: 28 - i * 5,
    })),
    growth: {
      revenue_pct: plan === "enterprise" ? 18 : 12,
      bookings_pct: 8,
      roster_pct: 5,
    },
    generated_at: new Date().toISOString(),
    scenario,
    label: templateLabel,
  };

  await admin
    .from("agency_organizations")
    .update({ metadata: { ...metadata, analytics_snapshot: snapshot } })
    .eq("id", orgId);
}

export async function seedAgencyScenario(
  admin: SupabaseClient,
  log: TestCreationLog,
  orgId: string,
  ownerUserId: string,
  scenario: AgencyScenarioSlug,
  seed: number,
  options: SeedAgencyOptions
) {
  const template = getAgencyOrgTemplate(scenario);
  const team = options.teamUserIds ?? [];
  const fillMissingOnly = options.fillMissingOnly ?? false;
  const bookingManager = team.find((t) => t.role === "booking_manager")?.userId ?? ownerUserId;
  const artistManager = team.find((t) => t.role === "artist_manager")?.userId ?? ownerUserId;

  const counts = await getOrgSeedCounts(admin, orgId, ownerUserId);

  logTestStep(log, `Step 6: Ensuring artist pool (${template.artistCount} target)...`);
  const { artists: artistPool } = await ensureAgencyArtistPool(admin, log, {
    orgId,
    requiredCount: template.artistCount,
    createdBy: options.createdBy,
    seed,
  });

  if (!artistPool.length) {
    throwParsedError(log, "Artist pool", new Error("No artists available after pool generation"), "No artists available after pool generation");
  }

  const artistIds = await seedAgencyRoster(
    admin,
    log,
    orgId,
    artistPool,
    team,
    bookingManager,
    artistManager,
    fillMissingOnly,
    template.artistCount
  );

  if (!fillMissingOnly || counts.bookings === 0) {
    await seedAgencyBookings(
      admin,
      log,
      orgId,
      ownerUserId,
      bookingManager,
      artistIds,
      scenario,
      seed,
      template.bookingCount
    );
  } else {
    logTestStep(log, "Bookings already seeded — skipping");
  }

  const calendarTarget = Math.min(24, Math.max(12, artistIds.length));
  if (!fillMissingOnly || counts.calendar === 0) {
    await seedAgencyCalendar(admin, log, orgId, artistIds, calendarTarget);
  } else {
    logTestStep(log, "Calendar already seeded — skipping");
  }

  if (!fillMissingOnly || counts.orders === 0) {
    await seedAgencyRevenue(admin, log, orgId, ownerUserId, artistIds, template.plan);
  } else {
    logTestStep(log, "Revenue already seeded — skipping");
  }

  if (!fillMissingOnly) {
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
  }

  const sponsorCount = template.plan === "enterprise" ? 5 : template.plan === "pro" ? 3 : 2;
  if (!fillMissingOnly || counts.sponsors === 0) {
    await seedAgencySponsorships(
      admin,
      log,
      orgId,
      ownerUserId,
      artistIds,
      template.label,
      scenario,
      template.plan,
      sponsorCount
    );
  } else {
    logTestStep(log, "Sponsorships already seeded — skipping");
  }

  if (!fillMissingOnly || counts.conversations === 0) {
    await seedAgencyConversations(admin, log, orgId, ownerUserId, template.label, team);
  } else {
    logTestStep(log, "Conversations already seeded — skipping");
  }

  logTestStep(log, "Seeding notifications for team...");
  await seedNotifications(admin, [ownerUserId, ...team.map((t) => t.userId)], template.label, fillMissingOnly);

  await seedAgencyAnalyticsSnapshot(
    admin,
    log,
    orgId,
    scenario,
    artistIds,
    template.label,
    template.plan
  );

  logTestStep(log, "Ensuring dashboard settings...");
  await ensureAgencyDashboardSettings(admin, orgId, scenario);

  logTestStep(log, "Agency scenario seed complete");
}
