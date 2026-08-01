import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import type { AgencyCalendarEvent } from "@/lib/agency/calendar";
import type { AgencyRevenueReport, AgencyRevenueLine } from "@/lib/agency/revenue-export";

async function getClient() {
  if (!isSupabaseConfigured()) return null;
  return createClient();
}

function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function listAgencyCalendarEvents(orgId: string): Promise<AgencyCalendarEvent[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("agency_calendar_events")
    .select("id, title, starts_at, ends_at, color, artist_id, notes, artists(stage_name)")
    .eq("organization_id", orgId)
    .order("starts_at", { ascending: true })
    .limit(200);

  return (data ?? []).map((row) => {
    const artist = unwrapJoin(row.artists as { stage_name: string } | { stage_name: string }[] | null);
    return {
      id: row.id as string,
      title: row.title as string,
      starts_at: row.starts_at as string,
      ends_at: row.ends_at as string,
      color: row.color as string | null,
      artist_id: row.artist_id as string | null,
      artist_name: artist?.stage_name ?? null,
      notes: row.notes as string | null,
    };
  });
}

export async function getAgencyRevenueReport(orgId: string, userId: string, periodDays = 90): Promise<AgencyRevenueReport | null> {
  const supabase = await getClient();
  if (!supabase) return null;

  const { data: membership } = await supabase
    .from("agency_organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) return null;

  const { data: org } = await supabase
    .from("agency_organizations")
    .select("name")
    .eq("id", orgId)
    .maybeSingle();

  const since = new Date();
  since.setDate(since.getDate() - periodDays);

  const { data: roster } = await supabase
    .from("agency_managed_artists")
    .select("artist_id, genres, artists(id, stage_name, category)")
    .eq("organization_id", orgId)
    .eq("status", "active");

  const artistIds = (roster ?? []).map((r) => r.artist_id as string);
  if (!artistIds.length) {
    return {
      orgName: (org?.name as string) ?? "Agency",
      periodLabel: `Last ${periodDays} days`,
      generatedAt: new Date().toLocaleString(),
      lines: [],
      totals: {
        grossCents: 0,
        feesCents: 0,
        netCents: 0,
        tickets: 0,
        subscriptions: 0,
        tips: 0,
        merchandise: 0,
        sponsorship: 0,
        advertising: 0,
        payouts: 0,
        refunds: 0,
      },
    };
  }

  const artistMap = new Map<string, { name: string; genre: string }>();
  for (const row of roster ?? []) {
    const artist = unwrapJoin(
      row.artists as { id: string; stage_name: string; category: string } | { id: string; stage_name: string; category: string }[] | null
    );
    if (artist) artistMap.set(artist.id, { name: artist.stage_name, genre: artist.category });
  }

  const [{ data: tickets }, { data: orders }, { data: events }] = await Promise.all([
    supabase
      .from("tickets")
      .select("id, price_cents, created_at, event_id, events(title, tour_state_code, artist_id, venue_id, venues(default_name))")
      .gte("created_at", since.toISOString()),
    supabase
      .from("orders")
      .select("id, total_cents, status, created_at, metadata")
      .eq("status", "paid")
      .gte("created_at", since.toISOString()),
    supabase
      .from("events")
      .select("id, title, artist_id, tour_state_code")
      .in("artist_id", artistIds)
      .gte("scheduled_at", since.toISOString()),
  ]);

  const lines: AgencyRevenueLine[] = [];
  const totals = {
    grossCents: 0,
    feesCents: 0,
    netCents: 0,
    tickets: 0,
    subscriptions: 0,
    tips: 0,
    merchandise: 0,
    sponsorship: 0,
    advertising: 0,
    payouts: 0,
    refunds: 0,
  };

  for (const ticket of tickets ?? []) {
    const event = unwrapJoin(
      ticket.events as
        | {
            title: string;
            tour_state_code: string | null;
            artist_id: string;
            venues: { default_name: string } | { default_name: string }[] | null;
          }
        | {
            title: string;
            tour_state_code: string | null;
            artist_id: string;
            venues: { default_name: string } | { default_name: string }[] | null;
          }[]
        | null
    );
    if (!event || !artistIds.includes(event.artist_id)) continue;

    const artist = artistMap.get(event.artist_id);
    const gross = (ticket.price_cents as number) ?? 0;
    const fees = Math.round(gross * 0.1);
    const net = gross - fees;
    const venue = unwrapJoin(event.venues);

    lines.push({
      category: "Tickets",
      source: "ticket_sale",
      artistName: artist?.name ?? null,
      genre: artist?.genre ?? null,
      state: event.tour_state_code,
      venue: venue?.default_name ?? null,
      performance: event.title,
      grossCents: gross,
      feesCents: fees,
      netCents: net,
      count: 1,
      month: new Date(ticket.created_at as string).toLocaleString("default", { month: "short", year: "numeric" }),
    });

    totals.grossCents += gross;
    totals.feesCents += fees;
    totals.netCents += net;
    totals.tickets += 1;
  }

  for (const order of orders ?? []) {
    const metadata = (order.metadata as Record<string, unknown>) ?? {};
    const artistId = metadata.artist_id as string | undefined;
    if (artistId && !artistIds.includes(artistId)) continue;

    const kind = (metadata.kind as string) ?? "order";
    const gross = (order.total_cents as number) ?? 0;
    const fees = Math.round(gross * 0.08);
    const net = gross - fees;
    const artist = artistId ? artistMap.get(artistId) : undefined;

    const category =
      kind === "tip"
        ? "Tips"
        : kind === "merch"
          ? "Merchandise"
          : kind === "subscription"
            ? "Subscriptions"
            : kind === "sponsorship"
              ? "Sponsorship"
              : "Other";

    lines.push({
      category,
      source: kind,
      artistName: artist?.name ?? null,
      genre: artist?.genre ?? null,
      state: null,
      venue: null,
      performance: null,
      grossCents: gross,
      feesCents: fees,
      netCents: net,
      count: 1,
      month: new Date(order.created_at as string).toLocaleString("default", { month: "short", year: "numeric" }),
    });

    totals.grossCents += gross;
    totals.feesCents += fees;
    totals.netCents += net;

    if (kind === "tip") totals.tips += gross;
    else if (kind === "merch") totals.merchandise += gross;
    else if (kind === "subscription") totals.subscriptions += gross;
    else if (kind === "sponsorship") totals.sponsorship += gross;
  }

  if (!lines.length && (events ?? []).length) {
    for (const event of events ?? []) {
      const artist = artistMap.get(event.artist_id as string);
      lines.push({
        category: "Performances",
        source: "scheduled_event",
        artistName: artist?.name ?? null,
        genre: artist?.genre ?? null,
        state: event.tour_state_code as string | null,
        venue: null,
        performance: event.title as string,
        grossCents: 0,
        feesCents: 0,
        netCents: 0,
        count: 1,
        month: new Date().toLocaleString("default", { month: "short", year: "numeric" }),
      });
    }
  }

  return {
    orgName: (org?.name as string) ?? "Agency",
    periodLabel: `Last ${periodDays} days`,
    generatedAt: new Date().toLocaleString(),
    lines,
    totals,
  };
}

export type AgencyConversation = {
  id: string;
  subject: string | null;
  participant_type: string;
  created_at: string;
  updated_at: string;
  last_message?: string | null;
  unread_count?: number;
};

export type AgencyMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  attachments: Array<{ url: string; name: string; type: string; size?: number }>;
  read_at: string | null;
  created_at: string;
  sender?: { display_name: string | null; avatar_url: string | null } | null;
};

export async function listAgencyConversations(orgId: string): Promise<AgencyConversation[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("agency_conversations")
    .select("id, subject, participant_type, created_at, updated_at")
    .eq("organization_id", orgId)
    .order("updated_at", { ascending: false })
    .limit(50);

  const conversations: AgencyConversation[] = [];
  for (const row of data ?? []) {
    const { data: lastMsg } = await supabase
      .from("agency_messages")
      .select("body")
      .eq("conversation_id", row.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    conversations.push({
      id: row.id as string,
      subject: row.subject as string | null,
      participant_type: row.participant_type as string,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      last_message: (lastMsg?.body as string) ?? null,
    });
  }

  return conversations;
}

export async function listAgencyMessages(conversationId: string, userId: string): Promise<AgencyMessage[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data: conv } = await supabase
    .from("agency_conversations")
    .select("organization_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conv) return [];

  const { data: membership } = await supabase
    .from("agency_organization_members")
    .select("id")
    .eq("organization_id", conv.organization_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) return [];

  const { data } = await supabase
    .from("agency_messages")
    .select("id, conversation_id, sender_id, body, attachments, read_at, created_at, profiles(display_name, avatar_url)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    conversation_id: row.conversation_id as string,
    sender_id: row.sender_id as string,
    body: row.body as string,
    attachments: (row.attachments as AgencyMessage["attachments"]) ?? [],
    read_at: row.read_at as string | null,
    created_at: row.created_at as string,
    sender: unwrapJoin(
      row.profiles as
        | { display_name: string | null; avatar_url: string | null }
        | { display_name: string | null; avatar_url: string | null }[]
        | null
    ),
  }));
}

export type AgencySponsorshipProposal = {
  id: string;
  title: string;
  description: string | null;
  budget_cents: number | null;
  status: string;
  slot_type_slug: string | null;
  venue_id: string | null;
  artist_id: string | null;
  submitted_at: string | null;
  created_at: string;
  artist_name?: string | null;
  venue_name?: string | null;
};

export async function listAgencySponsorshipProposals(orgId: string): Promise<AgencySponsorshipProposal[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("agency_sponsorship_proposals")
    .select("*, artists(stage_name), venues(default_name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | null,
    budget_cents: row.budget_cents as number | null,
    status: row.status as string,
    slot_type_slug: row.slot_type_slug as string | null,
    venue_id: row.venue_id as string | null,
    artist_id: row.artist_id as string | null,
    submitted_at: row.submitted_at as string | null,
    created_at: row.created_at as string,
    artist_name: unwrapJoin(row.artists as { stage_name: string } | null)?.stage_name ?? null,
    venue_name: unwrapJoin(row.venues as { default_name: string } | null)?.default_name ?? null,
  }));
}

export async function listAgencyBackgroundJobs(orgId: string, limit = 20) {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("agency_background_jobs")
    .select("id, job_type, status, progress, total_steps, error_message, created_at, completed_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}
