import type { SupabaseClient } from "@supabase/supabase-js";
import {
  VENUE_HOF_CATEGORIES,
  venueHofCategoryBlurb,
  venueHofCategoryLabel,
} from "@/lib/constants/venue-hof";
import type { VenueHallOfFameReport, VenueHofEntry } from "@/lib/types/venue-hof";

type EventRow = {
  id: string;
  title: string;
  slug: string;
  scheduled_at: string;
  ended_at: string | null;
  artist_id: string;
  artists: { slug: string; stage_name: string } | { slug: string; stage_name: string }[] | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function artistMeta(ev: EventRow) {
  const a = first(ev.artists);
  return { slug: a?.slug ?? "", name: a?.stage_name ?? "Artist", artistId: ev.artist_id };
}

async function upsertEntry(
  supabase: SupabaseClient,
  venueId: string,
  category: string,
  entry: {
    holder_type: "artist" | "event" | "fan";
    holder_id: string | null;
    display_name: string;
    subtitle?: string | null;
    metric_value: number;
    metric_label: string;
    link_href?: string | null;
  }
) {
  await supabase.from("venue_hall_of_fame_entries").upsert(
    {
      venue_id: venueId,
      category,
      rank: 1,
      ...entry,
      computed_at: new Date().toISOString(),
    },
    { onConflict: "venue_id,category,rank" }
  );
}

export async function syncVenueHallOfFame(supabase: SupabaseClient, venueId: string) {
  const { data: events } = await supabase
    .from("events")
    .select("id, title, slug, scheduled_at, ended_at, artist_id, artists(slug, stage_name)")
    .eq("venue_id", venueId);

  const eventList = (events ?? []) as EventRow[];
  const eventIds = eventList.map((e) => e.id);
  if (!eventIds.length) return;

  const eventMap = new Map(eventList.map((e) => [e.id, e]));

  const { data: tickets } = await supabase
    .from("tickets")
    .select("event_id, price_cents")
    .in("event_id", eventIds);

  const ticketByEvent = new Map<string, { count: number; revenue: number }>();
  const ticketByArtist = new Map<string, number>();
  for (const t of tickets ?? []) {
    const eid = t.event_id as string;
    const cur = ticketByEvent.get(eid) ?? { count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += (t.price_cents as number) ?? 0;
    ticketByEvent.set(eid, cur);
    const ev = eventMap.get(eid);
    if (ev) {
      ticketByArtist.set(ev.artist_id, (ticketByArtist.get(ev.artist_id) ?? 0) + 1);
    }
  }

  let topAttEvent: { id: string; count: number } | null = null;
  for (const [id, meta] of ticketByEvent) {
    if (!topAttEvent || meta.count > topAttEvent.count) topAttEvent = { id, count: meta.count };
  }
  if (topAttEvent) {
    const ev = eventMap.get(topAttEvent.id)!;
    const a = artistMeta(ev);
    await upsertEntry(supabase, venueId, "top_attendance", {
      holder_type: "event",
      holder_id: ev.id,
      display_name: ev.title,
      subtitle: a.name,
      metric_value: topAttEvent.count,
      metric_label: "tickets sold",
      link_href: a.slug ? `/artists/${a.slug}/events/${ev.slug}` : null,
    });
  }

  let topRevArtist: { id: string; revenue: number } | null = null;
  const revByArtist = new Map<string, number>();
  for (const [eid, meta] of ticketByEvent) {
    const ev = eventMap.get(eid);
    if (!ev) continue;
    revByArtist.set(ev.artist_id, (revByArtist.get(ev.artist_id) ?? 0) + meta.revenue);
  }
  for (const [aid, revenue] of revByArtist) {
    if (!topRevArtist || revenue > topRevArtist.revenue) topRevArtist = { id: aid, revenue };
  }
  if (topRevArtist) {
    const ev = eventList.find((e) => e.artist_id === topRevArtist!.id);
    const a = ev ? artistMeta(ev) : { slug: "", name: "Artist", artistId: topRevArtist.id };
    await upsertEntry(supabase, venueId, "top_revenue", {
      holder_type: "artist",
      holder_id: topRevArtist.id,
      display_name: a.name,
      metric_value: topRevArtist.revenue,
      metric_label: "ticket revenue",
      link_href: a.slug ? `/artists/${a.slug}` : null,
    });
  }

  const { data: chats } = await supabase.from("chat_messages").select("event_id").in("event_id", eventIds);
  const chatCounts = new Map<string, number>();
  for (const row of chats ?? []) {
    const eid = row.event_id as string;
    chatCounts.set(eid, (chatCounts.get(eid) ?? 0) + 1);
  }
  let topView: { id: string; count: number } | null = null;
  for (const [id, count] of chatCounts) {
    if (!topView || count > topView.count) topView = { id, count };
  }
  if (topView) {
    const ev = eventMap.get(topView.id)!;
    const a = artistMeta(ev);
    await upsertEntry(supabase, venueId, "most_viewed", {
      holder_type: "event",
      holder_id: ev.id,
      display_name: ev.title,
      subtitle: "Live chat engagement",
      metric_value: topView.count,
      metric_label: "chat messages",
      link_href: a.slug ? `/artists/${a.slug}/events/${ev.slug}` : null,
    });
  }

  const { data: reviews } = await supabase.from("reviews").select("event_id, rating").in("event_id", eventIds);
  const reviewAgg = new Map<string, { sum: number; count: number }>();
  for (const r of reviews ?? []) {
    const eid = r.event_id as string;
    const cur = reviewAgg.get(eid) ?? { sum: 0, count: 0 };
    cur.sum += r.rating as number;
    cur.count += 1;
    reviewAgg.set(eid, cur);
  }
  let bestRated: { id: string; avg: number } | null = null;
  for (const [id, agg] of reviewAgg) {
    const avg = agg.sum / agg.count;
    if (!bestRated || avg > bestRated.avg) bestRated = { id, avg };
  }
  if (bestRated) {
    const ev = eventMap.get(bestRated.id)!;
    const a = artistMeta(ev);
    await upsertEntry(supabase, venueId, "highest_rated", {
      holder_type: "event",
      holder_id: ev.id,
      display_name: ev.title,
      subtitle: a.name,
      metric_value: bestRated.avg,
      metric_label: "average rating",
      link_href: a.slug ? `/artists/${a.slug}/events/${ev.slug}` : null,
    });
  }

  const { data: tips } = await supabase
    .from("tips")
    .select("artist_id, amount_cents, event_id")
    .in("event_id", eventIds);
  const tipsByArtist = new Map<string, number>();
  for (const tip of tips ?? []) {
    const aid = tip.artist_id as string;
    tipsByArtist.set(aid, (tipsByArtist.get(aid) ?? 0) + (tip.amount_cents as number));
  }
  let topTipArtist: { id: string; cents: number } | null = null;
  for (const [id, cents] of tipsByArtist) {
    if (!topTipArtist || cents > topTipArtist.cents) topTipArtist = { id, cents };
  }
  if (topTipArtist) {
    const ev = eventList.find((e) => e.artist_id === topTipArtist!.id);
    const a = ev ? artistMeta(ev) : { slug: "", name: "Artist", artistId: topTipArtist.id };
    await upsertEntry(supabase, venueId, "most_tips", {
      holder_type: "artist",
      holder_id: topTipArtist.id,
      display_name: a.name,
      metric_value: topTipArtist.cents,
      metric_label: "tips",
      link_href: a.slug ? `/artists/${a.slug}` : null,
    });
  }

  const { data: merchItems } = await supabase
    .from("order_items")
    .select("quantity, unit_price_cents, event_id, orders(artist_id, status)")
    .in("event_id", eventIds);

  const merchByArtist = new Map<string, number>();
  for (const item of merchItems ?? []) {
    const order = first(item.orders as { artist_id: string | null; status: string } | { artist_id: string | null; status: string }[]);
    if (order?.status !== "paid") continue;
    const aid = order.artist_id;
    if (!aid) continue;
    const total = (item.quantity as number) * (item.unit_price_cents as number);
    merchByArtist.set(aid, (merchByArtist.get(aid) ?? 0) + total);
  }
  let topMerch: { id: string; cents: number } | null = null;
  for (const [id, cents] of merchByArtist) {
    if (!topMerch || cents > topMerch.cents) topMerch = { id, cents };
  }
  if (topMerch) {
    const ev = eventList.find((e) => e.artist_id === topMerch!.id);
    const a = ev ? artistMeta(ev) : { slug: "", name: "Artist", artistId: topMerch.id };
    await upsertEntry(supabase, venueId, "most_merchandise", {
      holder_type: "artist",
      holder_id: topMerch.id,
      display_name: a.name,
      metric_value: topMerch.cents,
      metric_label: "merch sales",
      link_href: a.slug ? `/artists/${a.slug}/merch` : null,
    });
  }

  let longest: { ev: EventRow; minutes: number } | null = null;
  for (const ev of eventList) {
    if (!ev.ended_at) continue;
    const mins = (new Date(ev.ended_at).getTime() - new Date(ev.scheduled_at).getTime()) / 60000;
    if (mins <= 0) continue;
    if (!longest || mins > longest.minutes) longest = { ev, minutes: mins };
  }
  if (longest) {
    const a = artistMeta(longest.ev);
    await upsertEntry(supabase, venueId, "longest_running_show", {
      holder_type: "event",
      holder_id: longest.ev.id,
      display_name: longest.ev.title,
      subtitle: a.name,
      metric_value: Math.round(longest.minutes),
      metric_label: "minutes live",
      link_href: a.slug ? `/artists/${a.slug}/events/${longest.ev.slug}` : null,
    });
  }

  let fanFav: { id: string; count: number } | null = null;
  for (const [id, count] of ticketByArtist) {
    if (!fanFav || count > fanFav.count) fanFav = { id, count };
  }
  if (fanFav) {
    const ev = eventList.find((e) => e.artist_id === fanFav!.id);
    const a = ev ? artistMeta(ev) : { slug: "", name: "Artist", artistId: fanFav.id };
    await upsertEntry(supabase, venueId, "fan_favorite", {
      holder_type: "artist",
      holder_id: fanFav.id,
      display_name: a.name,
      metric_value: fanFav.count,
      metric_label: "tickets at venue",
      link_href: a.slug ? `/artists/${a.slug}` : null,
    });
  }

  const { data: loyalty } = await supabase
    .from("venue_loyalty_profiles")
    .select("user_id, points, profiles(display_name)")
    .eq("venue_id", venueId)
    .order("points", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (loyalty) {
    const prof = first(loyalty.profiles as { display_name: string | null } | { display_name: string | null }[]);
    await upsertEntry(supabase, venueId, "most_loyal_fans", {
      holder_type: "fan",
      holder_id: loyalty.user_id as string,
      display_name: prof?.display_name?.trim() || "Superfan",
      metric_value: loyalty.points as number,
      metric_label: "loyalty points",
      link_href: null,
    });
  }
}

function mapEntry(row: Record<string, unknown>): VenueHofEntry {
  const cat = row.category as string;
  return {
    category: cat,
    categoryLabel: venueHofCategoryLabel(cat),
    blurb: venueHofCategoryBlurb(cat),
    rank: row.rank as number,
    holderType: row.holder_type as VenueHofEntry["holderType"],
    displayName: row.display_name as string,
    subtitle: (row.subtitle as string | null) ?? null,
    metricValue: Number(row.metric_value),
    metricLabel: row.metric_label as string,
    linkHref: (row.link_href as string | null) ?? null,
  };
}

export async function buildVenueHallOfFameReport(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  venueSlug: string
): Promise<VenueHallOfFameReport | null> {
  const { data: venue } = await supabase
    .from("venues")
    .select("id, name, slug, is_hall_of_fame")
    .eq("slug", venueSlug)
    .maybeSingle();
  if (!venue) return null;

  await syncVenueHallOfFame(admin, venue.id as string);

  const { data: rows } = await supabase
    .from("venue_hall_of_fame_entries")
    .select("*")
    .eq("venue_id", venue.id)
    .order("category");

  const byCat = new Map((rows ?? []).map((r) => [r.category as string, mapEntry(r as Record<string, unknown>)]));
  const entries: VenueHofEntry[] = VENUE_HOF_CATEGORIES.map((c) => byCat.get(c.value)).filter(Boolean) as VenueHofEntry[];

  return {
    venueId: venue.id as string,
    venueSlug: venue.slug as string,
    venueName: venue.name as string,
    isHallOfFameVenue: venue.is_hall_of_fame as boolean,
    entries,
    computedAt: new Date().toISOString(),
  };
}
