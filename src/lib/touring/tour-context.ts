import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import {
  countRemainingStops,
  formatTimeUntil,
  getLiveStop,
  getNextStop,
  mapStopsToRouteStatus,
} from "@/lib/touring/tour-route-status";
import type { TourRouteStop } from "@/components/home/tour-route-map";

export type LiveTourSnapshot = {
  tourId: string;
  tourTitle: string;
  tourSlug: string;
  artistSlug: string;
  artistName: string;
  routeStops: TourRouteStop[];
  liveCity: string | null;
  nextCity: string | null;
  remainingStops: number;
  nextStopIn: string | null;
  liveEventId: string | null;
  liveEventSlug: string | null;
  viewerCount: number;
};

export type ActiveTourCity = {
  city: string;
  country: string;
  lat: number;
  lng: number;
  active: boolean;
};

/** Approximate coordinates for map pins — keyed by common tour cities. */
const CITY_COORDS: Record<string, { lat: number; lng: number; country: string }> = {
  boston: { lat: 42.36, lng: -71.06, country: "USA" },
  "new york": { lat: 40.71, lng: -74.01, country: "USA" },
  chicago: { lat: 41.88, lng: -87.63, country: "USA" },
  "los angeles": { lat: 34.05, lng: -118.24, country: "USA" },
  london: { lat: 51.51, lng: -0.13, country: "UK" },
  tokyo: { lat: 35.68, lng: 139.69, country: "Japan" },
  sydney: { lat: -33.87, lng: 151.21, country: "Australia" },
  paris: { lat: 48.86, lng: 2.35, country: "France" },
  atlanta: { lat: 33.75, lng: -84.39, country: "USA" },
  miami: { lat: 25.76, lng: -80.19, country: "USA" },
  philadelphia: { lat: 39.95, lng: -75.17, country: "USA" },
  providence: { lat: 41.82, lng: -71.41, country: "USA" },
};

function cityCoords(city: string): ActiveTourCity | null {
  const key = city.toLowerCase();
  const match = CITY_COORDS[key];
  if (!match) return null;
  return { city, country: match.country, lat: match.lat, lng: match.lng, active: true };
}

function normalizeRoutableStop(stop: Record<string, unknown>) {
  const citiesRaw = stop.cities;
  const city = Array.isArray(citiesRaw) ? citiesRaw[0] : citiesRaw;
  return {
    scheduled_at: stop.scheduled_at as string,
    tour_city: (stop.tour_city as string | null) ?? null,
    tour_state_code: (stop.tour_state_code as string | null) ?? null,
    virtual_location_label: (stop.virtual_location_label as string | null) ?? null,
    cities: city as { name: string } | null,
  };
}

/** Live tour progress snapshots for homepage and discovery surfaces. */
export async function getLiveTourSnapshots(limit = 3): Promise<LiveTourSnapshot[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data: liveEvents } = await supabase
    .from("events")
    .select(
      `
      id, slug, viewer_count,
      artists!inner(slug, stage_name, profiles!inner(is_test_account)),
      tour_stops!inner(
        id, tour_id, scheduled_at, tour_city, tour_state_code, virtual_location_label, stop_order,
        cities(name),
        tours!inner(id, title, slug, status)
      )
    `
    )
    .eq("status", "live")
    .eq("artists.profiles.is_test_account", false)
    .eq("tour_stops.tours.status", "published")
    .order("viewer_count", { ascending: false })
    .limit(limit);

  if (!liveEvents?.length) return [];

  const snapshots: LiveTourSnapshot[] = [];

  for (const event of liveEvents) {
    const stop = Array.isArray(event.tour_stops) ? event.tour_stops[0] : event.tour_stops;
    const tourRaw = stop?.tours;
    const tour = Array.isArray(tourRaw) ? tourRaw[0] : tourRaw;
    const artist = Array.isArray(event.artists) ? event.artists[0] : event.artists;
    if (!stop?.tour_id || !tour || !artist) continue;

    const { data: allStops } = await supabase
      .from("tour_stops")
      .select("scheduled_at, tour_city, tour_state_code, virtual_location_label, cities(name)")
      .eq("tour_id", stop.tour_id)
      .order("stop_order", { ascending: true });

    const routeStops = mapStopsToRouteStatus((allStops ?? []).map((s) => normalizeRoutableStop(s as Record<string, unknown>)));
    const live = getLiveStop(routeStops);
    const next = getNextStop(routeStops);
    const nextStopRow = allStops?.find((_, i) => routeStops[i]?.status === "next");

    snapshots.push({
      tourId: stop.tour_id,
      tourTitle: tour.title,
      tourSlug: tour.slug,
      artistSlug: artist.slug,
      artistName: artist.stage_name,
      routeStops,
      liveCity: live?.city ?? null,
      nextCity: next?.city ?? null,
      remainingStops: countRemainingStops(routeStops),
      nextStopIn: nextStopRow ? formatTimeUntil(nextStopRow.scheduled_at) : null,
      liveEventId: event.id,
      liveEventSlug: event.slug,
      viewerCount: event.viewer_count ?? 0,
    });
  }

  return snapshots;
}

/** Cities with active or upcoming tour stops for the global map. */
export async function getActiveTourMapCities(limit = 12): Promise<ActiveTourCity[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();

  const { data: stops } = await supabase
    .from("tour_stops")
    .select(
      `
      tour_city, virtual_location_label, scheduled_at,
      cities(name),
      tours!inner(status, artists!inner(profiles!inner(is_test_account)))
    `
    )
    .eq("tours.status", "published")
    .eq("tours.artists.profiles.is_test_account", false)
    .gte("scheduled_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit * 2);

  if (!stops?.length) return [];

  const seen = new Set<string>();
  const cities: ActiveTourCity[] = [];

  for (const stop of stops) {
    const citiesRaw = stop.cities;
    const cityRow = Array.isArray(citiesRaw) ? citiesRaw[0] : citiesRaw;
    const city =
      (cityRow as { name: string } | null)?.name ??
      stop.tour_city ??
      stop.virtual_location_label;
    if (!city || seen.has(city.toLowerCase())) continue;
    seen.add(city.toLowerCase());

    const coords = cityCoords(city);
    if (coords) {
      coords.active = new Date(stop.scheduled_at).getTime() <= Date.now();
      cities.push(coords);
    }
    if (cities.length >= limit) break;
  }

  return cities;
}

export async function getArtistActiveTourSnapshot(artistId: string): Promise<LiveTourSnapshot | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();

  const { data: tour } = await supabase
    .from("tours")
    .select("id, title, slug, artists(slug, stage_name)")
    .eq("artist_id", artistId)
    .in("status", ["published"])
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!tour) return null;

  const artist = Array.isArray(tour.artists) ? tour.artists[0] : tour.artists;
  if (!artist) return null;

  const { data: allStops } = await supabase
    .from("tour_stops")
    .select("scheduled_at, tour_city, tour_state_code, virtual_location_label, cities(name)")
    .eq("tour_id", tour.id)
    .order("stop_order", { ascending: true });

  if (!allStops?.length) return null;

  const routeStops = mapStopsToRouteStatus(allStops.map((s) => normalizeRoutableStop(s as Record<string, unknown>)));
  const hasActiveStop = routeStops.some((s) => s.status === "live" || s.status === "next");
  if (!hasActiveStop) return null;

  const { data: liveEvent } = await supabase
    .from("events")
    .select("id, slug, viewer_count, tour_stops!inner(tour_id)")
    .eq("status", "live")
    .eq("tour_stops.tour_id", tour.id)
    .maybeSingle();

  const live = getLiveStop(routeStops);
  const next = getNextStop(routeStops);
  const nextStopRow = allStops.find((_, i) => routeStops[i]?.status === "next");

  return {
    tourId: tour.id,
    tourTitle: tour.title,
    tourSlug: tour.slug,
    artistSlug: artist.slug,
    artistName: artist.stage_name,
    routeStops,
    liveCity: live?.city ?? null,
    nextCity: next?.city ?? null,
    remainingStops: countRemainingStops(routeStops),
    nextStopIn: nextStopRow ? formatTimeUntil(nextStopRow.scheduled_at) : null,
    liveEventId: liveEvent?.id ?? null,
    liveEventSlug: liveEvent?.slug ?? null,
    viewerCount: liveEvent?.viewer_count ?? 0,
  };
}
