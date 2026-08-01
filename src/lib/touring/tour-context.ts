import type { GlobeTourStop } from "@/components/home/tour-globe-map";
import type { TourRouteStop } from "@/components/home/tour-route-map";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import {
  buildGlobeStopsFromTourStops,
  activeCitiesToGlobeStops,
} from "@/lib/touring/globe-stops";
import {
  countRemainingStops,
  formatTimeUntil,
  getLiveStop,
  getNextStop,
  mapStopsToRouteStatus,
} from "@/lib/touring/tour-route-status";

export type LiveTourSnapshot = {
  tourId: string;
  tourTitle: string;
  tourSlug: string;
  artistSlug: string;
  artistName: string;
  routeStops: TourRouteStop[];
  globeStops: GlobeTourStop[];
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

function normalizeRoutableStop(stop: Record<string, unknown>) {
  const citiesRaw = stop.cities;
  const city = Array.isArray(citiesRaw) ? citiesRaw[0] : citiesRaw;
  return {
    scheduled_at: stop.scheduled_at as string,
    tour_city: (stop.tour_city as string | null) ?? null,
    tour_state_code: (stop.tour_state_code as string | null) ?? null,
    virtual_location_label: (stop.virtual_location_label as string | null) ?? null,
    cities: city as {
      name: string;
      latitude: number | null;
      longitude: number | null;
      countries?: { code: string; name: string } | { code: string; name: string }[] | null;
    } | null,
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
        cities(name, latitude, longitude, countries(code, name)),
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
      .select(
        "scheduled_at, tour_city, tour_state_code, virtual_location_label, cities(name, latitude, longitude, countries(code, name))"
      )
      .eq("tour_id", stop.tour_id)
      .order("stop_order", { ascending: true });

    const normalized = (allStops ?? []).map((s) => normalizeRoutableStop(s as Record<string, unknown>));
    const routeStops = mapStopsToRouteStatus(normalized);
    const globeStops = buildGlobeStopsFromTourStops(normalized, routeStops);
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
      globeStops,
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
      cities(name, latitude, longitude, countries(code, name)),
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
    const cityName =
      (cityRow as { name: string } | null)?.name ??
      stop.tour_city ??
      stop.virtual_location_label;
    if (!cityName || seen.has(cityName.toLowerCase())) continue;

    const lat = (cityRow as { latitude: number | null } | null)?.latitude;
    const lng = (cityRow as { longitude: number | null } | null)?.longitude;
    if (lat == null || lng == null) continue;

    seen.add(cityName.toLowerCase());
    const countryRaw = (cityRow as { countries?: { code: string; name: string } | { code: string; name: string }[] | null })?.countries;
    const country = Array.isArray(countryRaw) ? countryRaw[0] : countryRaw;

    cities.push({
      city: cityName,
      country: country?.code ?? country?.name ?? "",
      lat,
      lng,
      active: new Date(stop.scheduled_at).getTime() <= Date.now(),
    });
    if (cities.length >= limit) break;
  }

  return cities;
}

/** Globe stops for homepage — prefer live tour route, else scatter active cities. */
export async function getHomepageGlobeStops(): Promise<{ stops: GlobeTourStop[]; showRoute: boolean }> {
  const snapshots = await getLiveTourSnapshots(1);
  if (snapshots[0]?.globeStops.length) {
    return { stops: snapshots[0].globeStops, showRoute: true };
  }
  const cities = await getActiveTourMapCities(16);
  return { stops: activeCitiesToGlobeStops(cities), showRoute: false };
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
    .select(
      "scheduled_at, tour_city, tour_state_code, virtual_location_label, cities(name, latitude, longitude, countries(code, name))"
    )
    .eq("tour_id", tour.id)
    .order("stop_order", { ascending: true });

  if (!allStops?.length) return null;

  const normalized = allStops.map((s) => normalizeRoutableStop(s as Record<string, unknown>));
  const routeStops = mapStopsToRouteStatus(normalized);
  const globeStops = buildGlobeStopsFromTourStops(normalized, routeStops);
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
    globeStops,
    liveCity: live?.city ?? null,
    nextCity: next?.city ?? null,
    remainingStops: countRemainingStops(routeStops),
    nextStopIn: nextStopRow ? formatTimeUntil(nextStopRow.scheduled_at) : null,
    liveEventId: liveEvent?.id ?? null,
    liveEventSlug: liveEvent?.slug ?? null,
    viewerCount: liveEvent?.viewer_count ?? 0,
  };
}
