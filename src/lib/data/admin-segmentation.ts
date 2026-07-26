import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

export type SegmentFanRow = {
  userId: string;
  displayName: string | null;
  username: string | null;
  ticketCount: number;
  vipActive: boolean;
  genres: string[];
};

export type SegmentationResult = {
  title: string;
  description: string;
  count: number;
  fans: SegmentFanRow[];
  todo?: string;
};

async function fanRowsFromTickets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tickets: { user_id: string; tier: string; event_id: string }[]
) {
  const userIds = [...new Set(tickets.map((t) => t.user_id))];
  if (!userIds.length) return [] as SegmentFanRow[];

  const [{ data: profiles }, { data: vipRows }, { data: genreRows }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, username, favorite_genres").in("id", userIds),
    supabase.from("vip_memberships").select("user_id").eq("active", true).in("user_id", userIds),
    supabase.from("genres").select("id, name"),
  ]);

  const vipSet = new Set((vipRows ?? []).map((row) => row.user_id as string));
  const genreMap = new Map((genreRows ?? []).map((g) => [g.id as string, g.name as string]));

  const ticketCount = new Map<string, number>();
  for (const ticket of tickets) {
    ticketCount.set(ticket.user_id, (ticketCount.get(ticket.user_id) ?? 0) + 1);
  }

  return (profiles ?? []).map((profile) => {
    const favorites = (profile.favorite_genres as string[] | null) ?? [];
    return {
      userId: profile.id as string,
      displayName: profile.display_name as string | null,
      username: profile.username as string | null,
      ticketCount: ticketCount.get(profile.id as string) ?? 0,
      vipActive: vipSet.has(profile.id as string),
      genres: favorites.map((id) => genreMap.get(id) ?? id).filter(Boolean),
    };
  });
}

export async function segmentFansAcrossArtists(artistIds: string[]): Promise<SegmentationResult> {
  if (!isSupabaseConfigured() || artistIds.length < 2) {
    return {
      title: "Cross-artist fans",
      description: "Fans with tickets to every selected artist",
      count: 0,
      fans: [],
      todo: artistIds.length < 2 ? "Select at least two artists" : "Connect Supabase",
    };
  }

  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, artist_id")
    .in("artist_id", artistIds);

  const eventIds = (events ?? []).map((row) => row.id as string);
  if (!eventIds.length) {
    return {
      title: "Cross-artist fans",
      description: "Fans with tickets to every selected artist",
      count: 0,
      fans: [],
    };
  }

  const { data: tickets } = await supabase
    .from("tickets")
    .select("user_id, event_id, tier, events(artist_id)")
    .in("event_id", eventIds);

  const byUser = new Map<string, Set<string>>();
  for (const ticket of tickets ?? []) {
    const eventsRaw = ticket.events as { artist_id: string } | { artist_id: string }[] | null;
    const event = Array.isArray(eventsRaw) ? eventsRaw[0] : eventsRaw;
    const artistId = event?.artist_id;
    if (!artistId) continue;
    const set = byUser.get(ticket.user_id as string) ?? new Set<string>();
    set.add(artistId);
    byUser.set(ticket.user_id as string, set);
  }

  const matchedUserIds = [...byUser.entries()]
    .filter(([, set]) => artistIds.every((id) => set.has(id)))
    .map(([userId]) => userId);

  const matchedTickets = (tickets ?? []).filter((t) => matchedUserIds.includes(t.user_id as string));
  const fans = await fanRowsFromTickets(
    supabase,
    matchedTickets.map((t) => ({
      user_id: t.user_id as string,
      tier: t.tier as string,
      event_id: t.event_id as string,
    }))
  );

  return {
    title: "Cross-artist fans",
    description: `Fans with tickets to all ${artistIds.length} selected artists`,
    count: fans.length,
    fans: fans.slice(0, 50),
  };
}

export async function segmentFansByGenre(genreId: string): Promise<SegmentationResult> {
  if (!isSupabaseConfigured()) {
    return {
      title: "Genre audience",
      description: "Fans interested in a genre",
      count: 0,
      fans: [],
      todo: "Connect Supabase",
    };
  }

  const supabase = await createClient();
  const { data: genre } = await supabase.from("genres").select("name").eq("id", genreId).maybeSingle();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, username, favorite_genres")
    .contains("favorite_genres", [genreId])
    .limit(200);

  const userIds = (profiles ?? []).map((p) => p.id as string);
  const { data: tickets } = userIds.length
    ? await supabase.from("tickets").select("user_id, tier, event_id").in("user_id", userIds)
    : { data: [] as { user_id: string; tier: string; event_id: string }[] };

  const fans = await fanRowsFromTickets(supabase, tickets ?? []);

  return {
    title: `${genre?.name ?? "Genre"} fans`,
    description: "Fans who listed this genre in favorite_genres",
    count: fans.length,
    fans: fans.slice(0, 50),
    todo: "Ticket-attended genre affinity weighting pending analytics pipeline",
  };
}

export async function segmentRepeatViewers(minEvents = 2): Promise<SegmentationResult> {
  if (!isSupabaseConfigured()) {
    return {
      title: "Repeat viewers",
      description: "Fans with tickets to multiple events",
      count: 0,
      fans: [],
      todo: "Connect Supabase",
    };
  }

  const supabase = await createClient();
  const { data: tickets } = await supabase.from("tickets").select("user_id, tier, event_id");

  const counts = new Map<string, number>();
  for (const ticket of tickets ?? []) {
    counts.set(ticket.user_id as string, (counts.get(ticket.user_id as string) ?? 0) + 1);
  }

  const repeatIds = [...counts.entries()]
    .filter(([, count]) => count >= minEvents)
    .map(([userId]) => userId);

  const repeatTickets = (tickets ?? []).filter((t) => repeatIds.includes(t.user_id as string));
  const fans = await fanRowsFromTickets(
    supabase,
    repeatTickets.map((t) => ({
      user_id: t.user_id as string,
      tier: t.tier as string,
      event_id: t.event_id as string,
    }))
  );

  return {
    title: "Repeat viewers",
    description: `Fans with tickets to ${minEvents}+ events`,
    count: fans.length,
    fans: fans.sort((a, b) => b.ticketCount - a.ticketCount).slice(0, 50),
  };
}

export async function segmentVipConversion(): Promise<SegmentationResult> {
  if (!isSupabaseConfigured()) {
    return {
      title: "VIP conversion",
      description: "Ticket holders with active VIP",
      count: 0,
      fans: [],
      todo: "Connect Supabase",
    };
  }

  const supabase = await createClient();
  const { data: tickets } = await supabase.from("tickets").select("user_id, tier, event_id");
  const ticketUsers = [...new Set((tickets ?? []).map((t) => t.user_id as string))];
  const { data: vipRows } = ticketUsers.length
    ? await supabase.from("vip_memberships").select("user_id").eq("active", true).in("user_id", ticketUsers)
    : { data: [] as { user_id: string }[] };

  const vipSet = new Set((vipRows ?? []).map((row) => row.user_id as string));
  const convertedTickets = (tickets ?? []).filter((t) => vipSet.has(t.user_id as string));
  const fans = await fanRowsFromTickets(
    supabase,
    convertedTickets.map((t) => ({
      user_id: t.user_id as string,
      tier: t.tier as string,
      event_id: t.event_id as string,
    }))
  );

  const conversionRate =
    ticketUsers.length > 0 ? Math.round((vipSet.size / ticketUsers.length) * 100) : 0;

  return {
    title: "VIP conversion",
    description: `${conversionRate}% of ticket holders have active VIP (${vipSet.size}/${ticketUsers.length})`,
    count: fans.length,
    fans: fans.slice(0, 50),
  };
}

export async function segmentCrossGenreViewers(): Promise<SegmentationResult> {
  if (!isSupabaseConfigured()) {
    return {
      title: "Cross-genre viewers",
      description: "Fans whose tickets span multiple artist genres",
      count: 0,
      fans: [],
      todo: "Connect Supabase",
    };
  }

  const supabase = await createClient();
  const { data: tickets } = await supabase
    .from("tickets")
    .select("user_id, tier, event_id, events(artist_id, artists(artist_genres(genres(name))))");

  const userGenres = new Map<string, Set<string>>();
  for (const ticket of tickets ?? []) {
    const eventsRaw = ticket.events as unknown as Record<string, unknown> | Record<string, unknown>[] | null;
    const event = Array.isArray(eventsRaw) ? eventsRaw[0] : eventsRaw;
    const artistsRaw = event?.artists as Record<string, unknown> | Record<string, unknown>[] | undefined;
    const artist = Array.isArray(artistsRaw) ? artistsRaw[0] : artistsRaw;
    const agRaw = artist?.artist_genres as Record<string, unknown> | Record<string, unknown>[] | undefined;
    const artistGenres = Array.isArray(agRaw) ? agRaw : agRaw ? [agRaw] : [];

    const set = userGenres.get(ticket.user_id as string) ?? new Set<string>();
    for (const row of artistGenres) {
      const genresRaw = row.genres as { name?: string } | { name?: string }[] | undefined;
      const genre = Array.isArray(genresRaw) ? genresRaw[0] : genresRaw;
      if (genre?.name) set.add(genre.name);
    }
    userGenres.set(ticket.user_id as string, set);
  }

  const crossGenreIds = [...userGenres.entries()]
    .filter(([, genres]) => genres.size >= 2)
    .map(([userId]) => userId);

  const matchedTickets = (tickets ?? []).filter((t) => crossGenreIds.includes(t.user_id as string));
  const fans = await fanRowsFromTickets(
    supabase,
    matchedTickets.map((t) => ({
      user_id: t.user_id as string,
      tier: t.tier as string,
      event_id: t.event_id as string,
    }))
  );

  return {
    title: "Cross-genre viewers",
    description: "Fans with tickets to artists in 2+ genres",
    count: fans.length,
    fans: fans.slice(0, 50),
    todo: "Weighted genre affinity scores pending analytics pipeline",
  };
}

export async function listArtistsForSegmentation() {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("artists")
    .select("id, stage_name, slug")
    .order("stage_name", { ascending: true })
    .limit(200);
  return data ?? [];
}

export async function listGenresForSegmentation() {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("genres").select("id, name, slug").order("name");
  return data ?? [];
}
