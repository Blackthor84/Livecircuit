import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import type { Event, EventStatus } from "@/types/database";

export type ArtistEventListItem = Event & {
  tour_stops: { virtual_location_label: string; ticket_price_cents: number } | null;
};

export type ArtistEventDetail = Event & {
  started_at: string | null;
  ended_at: string | null;
  tour_stops: {
    virtual_location_label: string;
    ticket_price_cents: number;
    vip_price_cents: number | null;
  } | null;
  streams: {
    id: string;
    provider: string;
    status: string;
    external_stream_id: string | null;
  } | null;
};

export async function listArtistUpcomingEvents(artistId: string): Promise<ArtistEventListItem[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data } = await supabase
    .from("events")
    .select("*, tour_stops(virtual_location_label, ticket_price_cents)")
    .eq("artist_id", artistId)
    .in("status", ["draft", "scheduled", "live"] satisfies EventStatus[])
    .gte("scheduled_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(20);

  return (data ?? []) as ArtistEventListItem[];
}

export async function getArtistEventById(
  userId: string,
  eventId: string
): Promise<(ArtistEventDetail & { artistSlug: string }) | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data: artist } = await supabase
    .from("artists")
    .select("id, slug")
    .eq("user_id", userId)
    .maybeSingle();
  if (!artist) return null;

  const { data } = await supabase
    .from("events")
    .select(
      "*, tour_stops(virtual_location_label, ticket_price_cents, vip_price_cents), streams(id, provider, status, external_stream_id)"
    )
    .eq("id", eventId)
    .eq("artist_id", artist.id)
    .maybeSingle();

  if (!data) return null;

  const streams = Array.isArray(data.streams) ? data.streams[0] : data.streams;

  return {
    ...(data as ArtistEventDetail),
    streams: streams ?? null,
    artistSlug: artist.slug,
  };
}

export function eventPublicPath(artistSlug: string, eventSlug: string) {
  return `/artists/${artistSlug}/events/${eventSlug}`;
}

export function eventLivePath(artistSlug: string, eventSlug: string) {
  return eventPublicPath(artistSlug, eventSlug);
}
