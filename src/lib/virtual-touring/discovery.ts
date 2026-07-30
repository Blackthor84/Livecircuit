import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { PUBLIC_DISCOVERY_EVENT_SELECT } from "@/lib/testing/public-filter";
import type { TourDiscoveryFilter } from "@/lib/virtual-touring/types";

export type DiscoverableTourEvent = {
  id: string;
  slug: string;
  title: string;
  scheduledAt: string;
  status: string;
  tourCity: string | null;
  tourStateCode: string | null;
  tourStateName: string | null;
  audienceMode: string;
  artistSlug: string;
  artistName: string;
  tourTitle: string | null;
  ticketPriceCents: number;
  venueName: string | null;
};

export type FanLocationContext = {
  cityName: string | null;
  stateCode: string | null;
  countryCode: string | null;
};

const eventSelect = PUBLIC_DISCOVERY_EVENT_SELECT;

export async function getFanLocationContext(userId: string): Promise<FanLocationContext | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("cities(name), states(code), countries(code)")
    .eq("id", userId)
    .maybeSingle();

  if (!data) return null;
  const city = Array.isArray(data.cities) ? data.cities[0] : data.cities;
  const state = Array.isArray(data.states) ? data.states[0] : data.states;
  const country = Array.isArray(data.countries) ? data.countries[0] : data.countries;

  return {
    cityName: (city as { name: string } | null)?.name ?? null,
    stateCode: (state as { code: string } | null)?.code ?? null,
    countryCode: (country as { code: string } | null)?.code ?? null,
  };
}

export async function discoverTourEvents(
  filter: TourDiscoveryFilter,
  fanLocation: FanLocationContext | null,
  limit = 12
): Promise<DiscoverableTourEvent[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  let query = supabase
    .from("events")
    .select(eventSelect)
    .eq("artists.profiles.is_test_account", false)
    .in("status", ["scheduled", "live"])
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (filter === "near_me" && fanLocation?.cityName) {
    query = query.ilike("tour_city", fanLocation.cityName);
  } else if (filter === "my_state" && fanLocation?.stateCode) {
    query = query.eq("tour_state_code", fanLocation.stateCode);
  } else if (filter === "country") {
    query = query.not("tour_state_code", "is", null);
  } else if (filter === "worldwide") {
    query = query.eq("audience_mode", "worldwide");
  }

  const { data } = await query;
  return (data ?? []).map(mapDiscoverEvent);
}

function mapDiscoverEvent(row: Record<string, unknown>): DiscoverableTourEvent {
  const artists = row.artists as { slug: string; stage_name: string } | { slug: string; stage_name: string }[] | null;
  const artist = Array.isArray(artists) ? artists[0] : artists;
  const stopRaw = row.tour_stops as
    | { ticket_price_cents: number; tours: { title: string } | { title: string }[] | null }
    | { ticket_price_cents: number; tours: { title: string } | { title: string }[] | null }[]
    | null;
  const stop = Array.isArray(stopRaw) ? stopRaw[0] : stopRaw;
  const tourRaw = stop?.tours;
  const tour = Array.isArray(tourRaw) ? tourRaw[0] : tourRaw;
  const venueRaw = row.venues as { name: string } | { name: string }[] | null;
  const venue = Array.isArray(venueRaw) ? venueRaw[0] : venueRaw;

  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    scheduledAt: row.scheduled_at as string,
    status: row.status as string,
    tourCity: row.tour_city as string | null,
    tourStateCode: row.tour_state_code as string | null,
    tourStateName: row.tour_state_name as string | null,
    audienceMode: row.audience_mode as string,
    artistSlug: artist?.slug ?? "",
    artistName: artist?.stage_name ?? "Artist",
    tourTitle: tour?.title ?? null,
    ticketPriceCents: stop?.ticket_price_cents ?? 0,
    venueName: venue?.name ?? null,
  };
}
