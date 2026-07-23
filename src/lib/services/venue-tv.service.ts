import type { SupabaseClient } from "@supabase/supabase-js";
import { VENUE_TV_PROGRAM_TYPES } from "@/lib/constants/venue-tv";
import { pickNowPlayingIndex, rotateUpNext } from "@/lib/services/venue-tv-playlist";
import type { VenueTvProgram, VenueTvReport } from "@/lib/types/venue-tv";

function first<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapProgram(row: Record<string, unknown>): VenueTvProgram {
  return {
    id: row.id as string,
    programType: row.program_type as string,
    title: row.title as string,
    summary: row.summary as string,
    mediaUrl: (row.media_url as string | null) ?? null,
    thumbnailUrl: (row.thumbnail_url as string | null) ?? null,
    linkHref: (row.link_href as string | null) ?? null,
    durationSeconds: row.duration_seconds as number,
  };
}

async function upsertProgram(
  supabase: SupabaseClient,
  venueId: string,
  payload: {
    program_type: string;
    source_key: string;
    title: string;
    summary: string;
    media_url?: string | null;
    thumbnail_url?: string | null;
    link_href?: string | null;
    duration_seconds?: number;
    event_id?: string | null;
    artist_id?: string | null;
  }
) {
  await supabase.from("venue_tv_programs").upsert(
    {
      venue_id: venueId,
      ...payload,
      is_published: true,
    },
    { onConflict: "venue_id,source_key" }
  );
}

export async function syncVenueTvPlaylist(supabase: SupabaseClient, venueId: string, venueName: string) {
  const now = new Date().toISOString();

  await upsertProgram(supabase, venueId, {
    program_type: "venue_news",
    source_key: "static:venue_news",
    title: `${venueName} — venue news`,
    summary: "Schedules, concourse updates, and community highlights.",
    duration_seconds: 120,
  });

  await upsertProgram(supabase, venueId, {
    program_type: "trailer",
    source_key: "static:welcome_trailer",
    title: `Welcome to ${venueName} TV`,
    summary: "Your front-row pass to everything happening at this venue.",
    duration_seconds: 90,
  });

  const { data: upcomingEvents } = await supabase
    .from("events")
    .select("id, title, slug, scheduled_at, banner_url, artists(slug, stage_name)")
    .eq("venue_id", venueId)
    .gte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(12);

  for (const ev of upcomingEvents ?? []) {
    const artist = first(ev.artists as { slug: string; stage_name: string } | { slug: string; stage_name: string }[]);
    await upsertProgram(supabase, venueId, {
      program_type: "upcoming_show",
      source_key: `event:upcoming:${ev.id}`,
      title: ev.title as string,
      summary: artist ? `Upcoming with ${artist.stage_name}` : "Upcoming live event",
      thumbnail_url: (ev.banner_url as string | null) ?? null,
      link_href: artist ? `/artists/${artist.slug}/events/${ev.slug as string}` : null,
      duration_seconds: 150,
      event_id: ev.id as string,
    });
  }

  const { data: pastEvents } = await supabase
    .from("events")
    .select("id, title, slug, banner_url, artists(slug, stage_name)")
    .eq("venue_id", venueId)
    .lt("scheduled_at", now)
    .order("scheduled_at", { ascending: false })
    .limit(8);

  for (const ev of pastEvents ?? []) {
    const artist = first(ev.artists as { slug: string; stage_name: string } | { slug: string; stage_name: string }[]);
    await upsertProgram(supabase, venueId, {
      program_type: "highlight",
      source_key: `event:highlight:${ev.id}`,
      title: `Highlight — ${ev.title as string}`,
      summary: "Best moments from a recent show.",
      thumbnail_url: (ev.banner_url as string | null) ?? null,
      link_href: artist ? `/artists/${artist.slug}/events/${ev.slug as string}` : null,
      duration_seconds: 180,
      event_id: ev.id as string,
    });
  }

  const { data: ads } = await supabase
    .from("advertisement_schedules")
    .select("advertisements(name, asset_url, click_url, campaigns(venue_id))")
    .eq("is_active", true)
    .limit(20);

  for (const row of ads ?? []) {
    const adRaw = row.advertisements as
      | { name: string; asset_url: string | null; click_url: string | null; campaigns: { venue_id: string | null } | { venue_id: string | null }[] }
      | { name: string; asset_url: string | null; click_url: string | null; campaigns: { venue_id: string | null } | { venue_id: string | null }[] }[];
    const ad = Array.isArray(adRaw) ? adRaw[0] : adRaw;
    if (!ad) continue;
    const camp = first(ad.campaigns);
    if (camp?.venue_id && camp.venue_id !== venueId) continue;
    await upsertProgram(supabase, venueId, {
      program_type: "sponsor_commercial",
      source_key: `ad:${ad.name}:${camp?.venue_id ?? "global"}`,
      title: ad.name,
      summary: "Presented by a LiveCircuit partner.",
      media_url: ad.asset_url,
      link_href: ad.click_url,
      duration_seconds: 30,
    });
  }

  const { data: festSlots } = await supabase
    .from("festival_slots")
    .select("id, title, virtual_festivals(name, slug)")
    .eq("venue_id", venueId)
    .limit(20);

  for (const slot of festSlots ?? []) {
    const fest = first(
      slot.virtual_festivals as { name: string; slug: string } | { name: string; slug: string }[]
    );
    if (!fest) continue;
    await upsertProgram(supabase, venueId, {
      program_type: "festival_announcement",
      source_key: `fest:${slot.id}`,
      title: fest.name,
      summary: (slot.title as string) || "Festival programming",
      link_href: `/festivals/${fest.slug}`,
      duration_seconds: 60,
    });
  }

  const { data: playlistRow } = await supabase
    .from("venue_tv_playlists")
    .select("id")
    .eq("venue_id", venueId)
    .eq("is_auto_generated", true)
    .maybeSingle();

  let playlistId = playlistRow?.id as string | undefined;
  if (!playlistId) {
    const { data: created } = await supabase
      .from("venue_tv_playlists")
      .insert({ venue_id: venueId, name: "Auto lineup", is_auto_generated: true, is_active: true })
      .select("id")
      .single();
    playlistId = created?.id as string;
  }

  if (!playlistId) return;

  await supabase.from("venue_tv_playlist_items").delete().eq("playlist_id", playlistId);

  const { data: programs } = await supabase
    .from("venue_tv_programs")
    .select("id, program_type, created_at")
    .eq("venue_id", venueId)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  const order = [
    "upcoming_show",
    "festival_announcement",
    "highlight",
    "sponsor_commercial",
    "trailer",
    "interview",
    "music_video",
    "comedy_clip",
    "behind_scenes",
    "venue_news",
  ];

  const sorted = (programs ?? []).slice().sort((a, b) => {
    const ai = order.indexOf(a.program_type as string);
    const bi = order.indexOf(b.program_type as string);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const items = sorted.map((p, idx) => ({
    playlist_id: playlistId,
    program_id: p.id as string,
    position: idx + 1,
  }));

  if (items.length) {
    await supabase.from("venue_tv_playlist_items").insert(items);
  }

  await supabase.from("venue_tv_channels").upsert(
    {
      venue_id: venueId,
      title: `${venueName} TV`,
      tagline: "LiveCircuit Venue Television",
      is_on_air: true,
      active_playlist_id: playlistId,
      updated_at: now,
    },
    { onConflict: "venue_id" }
  );
}

export async function buildVenueTvReport(supabase: SupabaseClient, venueSlug: string): Promise<VenueTvReport | null> {
  const { data: venue } = await supabase.from("venues").select("id, name, slug").eq("slug", venueSlug).maybeSingle();
  if (!venue) return null;

  await syncVenueTvPlaylist(supabase, venue.id as string, venue.name as string);

  const { data: channel } = await supabase
    .from("venue_tv_channels")
    .select("title, tagline, is_on_air, active_playlist_id")
    .eq("venue_id", venue.id)
    .maybeSingle();

  let lineup: VenueTvProgram[] = [];
  if (channel?.active_playlist_id) {
    const { data: items } = await supabase
      .from("venue_tv_playlist_items")
      .select("position, venue_tv_programs(*)")
      .eq("playlist_id", channel.active_playlist_id)
      .order("position");

    lineup = (items ?? [])
      .map((row) => {
        const prog = row.venue_tv_programs as Record<string, unknown> | Record<string, unknown>[] | null;
        const p = Array.isArray(prog) ? prog[0] : prog;
        return p ? mapProgram(p) : null;
      })
      .filter(Boolean) as VenueTvProgram[];
  }

  const nowIndex = pickNowPlayingIndex(lineup);
  const nowPlaying = lineup[nowIndex] ?? null;
  const upNext = rotateUpNext(lineup, nowIndex, 6);

  const byType: Record<string, VenueTvProgram[]> = {};
  for (const t of VENUE_TV_PROGRAM_TYPES) {
    byType[t.value] = lineup.filter((p) => p.programType === t.value);
  }

  return {
    venueId: venue.id as string,
    venueSlug: venue.slug as string,
    venueName: venue.name as string,
    channelTitle: (channel?.title as string) ?? `${venue.name} TV`,
    tagline: (channel?.tagline as string) ?? "",
    isOnAir: (channel?.is_on_air as boolean) ?? true,
    nowPlaying,
    upNext,
    lineup,
    byType,
    computedAt: new Date().toISOString(),
  };
}

export async function recordVenueTvProgramView(
  supabase: SupabaseClient,
  programId: string,
  userId: string | null
) {
  await supabase.from("venue_tv_program_views").insert({
    program_id: programId,
    user_id: userId,
  });
}
