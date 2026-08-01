import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import type { HeatPoint } from "@/lib/maps/heat-types";
import { buildGlobeStopsFromTourStops } from "@/lib/touring/globe-stops";
import { mapStopsToRouteStatus } from "@/lib/touring/tour-route-status";
import type { GlobeTourStop } from "@/components/home/tour-globe-map";

export type PlatformLiveStats = {
  artistsTouring: number;
  livePerformances: number;
  countriesWatching: number;
  activeArenas: number;
  fansWatching: number;
  toursStartingToday: number;
};

export type TourActivityItem = {
  id: string;
  message: string;
  href?: string;
};

export type HomepageTourSection = {
  id: string;
  title: string;
  slug: string;
  artistName: string;
  artistSlug: string;
  followerCount?: number;
  startsAt?: string | null;
  city?: string;
};

export type HomepageTouringPayload = {
  stats: PlatformLiveStats;
  activityFeed: TourActivityItem[];
  heatPoints: HeatPoint[];
  heroGlobeStops: GlobeTourStop[];
  showHeroRoute: boolean;
  hasLiveActivity: boolean;
  liveTours: HomepageTourSection[];
  toursStartingSoon: HomepageTourSection[];
  trendingTours: HomepageTourSection[];
  mostFollowedTours: HomepageTourSection[];
  completedTours: HomepageTourSection[];
  popularCities: { city: string; stops: number }[];
  popularArenas: { name: string; slug: string; events: number }[];
  passportStamps: string[];
};

const ZERO_STATS: PlatformLiveStats = {
  artistsTouring: 0,
  livePerformances: 0,
  countriesWatching: 0,
  activeArenas: 0,
  fansWatching: 0,
  toursStartingToday: 0,
};

function emptyPayload(): HomepageTouringPayload {
  return {
    stats: { ...ZERO_STATS },
    activityFeed: [],
    heatPoints: [],
    heroGlobeStops: [],
    showHeroRoute: false,
    hasLiveActivity: false,
    liveTours: [],
    toursStartingSoon: [],
    trendingTours: [],
    mostFollowedTours: [],
    completedTours: [],
    popularCities: [],
    popularArenas: [],
    passportStamps: [],
  };
}

function normalizeTourRow(row: Record<string, unknown>): HomepageTourSection | null {
  const artists = row.artists;
  const artist = Array.isArray(artists) ? artists[0] : artists;
  if (!artist || typeof artist !== "object") return null;
  const a = artist as { slug: string; stage_name: string };
  return {
    id: row.id as string,
    title: row.title as string,
    slug: row.slug as string,
    artistName: a.stage_name,
    artistSlug: a.slug,
    followerCount: (row.follower_count as number | null) ?? 0,
    startsAt: (row.starts_at as string | null) ?? null,
  };
}

export async function getHomepageTouringPayload(): Promise<HomepageTouringPayload> {
  if (!isSupabaseConfigured()) return emptyPayload();

  const supabase = await createClient();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [
    liveEventsRes,
    publishedToursRes,
    liveTourArtistsRes,
    activeVenuesRes,
    cityStopsRes,
    completedToursRes,
    fanCountriesRes,
  ] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, title, slug, viewer_count, artists(slug, stage_name, profiles!inner(is_test_account)), tour_stops(tour_id, tour_city, virtual_location_label, cities(name, latitude, longitude))"
      )
      .eq("status", "live")
      .eq("artists.profiles.is_test_account", false)
      .order("viewer_count", { ascending: false })
      .limit(8),
    supabase
      .from("tours")
      .select(
        "id, title, slug, starts_at, ends_at, follower_count, artists(slug, stage_name, profiles!inner(is_test_account))"
      )
      .eq("status", "published")
      .eq("artists.profiles.is_test_account", false)
      .order("follower_count", { ascending: false })
      .limit(12),
    supabase
      .from("tours")
      .select("artist_id, artists!inner(profiles!inner(is_test_account))")
      .eq("status", "published")
      .eq("artists.profiles.is_test_account", false),
    supabase
      .from("tour_stops")
      .select("venue_id, venues!inner(id, slug, name), tours!inner(status, artists!inner(profiles!inner(is_test_account)))")
      .eq("tours.status", "published")
      .eq("tours.artists.profiles.is_test_account", false)
      .not("venue_id", "is", null)
      .limit(200),
    supabase
      .from("tour_stops")
      .select("tour_city, cities(name), tours!inner(status, artists!inner(profiles!inner(is_test_account)))")
      .eq("tours.status", "published")
      .eq("tours.artists.profiles.is_test_account", false)
      .limit(500),
    supabase
      .from("tours")
      .select("id, title, slug, ends_at, artists(slug, stage_name, profiles!inner(is_test_account))")
      .eq("status", "published")
      .eq("artists.profiles.is_test_account", false)
      .lt("ends_at", now.toISOString())
      .order("ends_at", { ascending: false })
      .limit(6),
    supabase
      .from("profiles")
      .select("country_id, countries!inner(code)")
      .eq("is_test_account", false)
      .not("country_id", "is", null)
      .limit(1000),
  ]);

  const liveEvents = liveEventsRes.data ?? [];
  const publishedTours = publishedToursRes.data ?? [];

  if (liveEvents.length === 0 && publishedTours.length === 0) {
    return emptyPayload();
  }

  const fansWatching = liveEvents.reduce((s, e) => s + (e.viewer_count ?? 0), 0);
  const artistIds = new Set((liveTourArtistsRes.data ?? []).map((t) => t.artist_id));

  const fanCountryIds = new Set(
    (fanCountriesRes.data ?? [])
      .map((p) => {
        const c = p.countries;
        const row = Array.isArray(c) ? c[0] : c;
        return (row as { code?: string } | null)?.code;
      })
      .filter(Boolean)
  );

  const toursStartingToday = publishedTours.filter((t) => {
    if (!t.starts_at) return false;
    const d = new Date(t.starts_at);
    return d >= todayStart && d < todayEnd;
  }).length;

  const stats: PlatformLiveStats = {
    artistsTouring: artistIds.size,
    livePerformances: liveEvents.length,
    countriesWatching: fanCountryIds.size,
    activeArenas: new Set((activeVenuesRes.data ?? []).map((r) => r.venue_id)).size,
    fansWatching,
    toursStartingToday,
  };

  const heatPoints: HeatPoint[] = liveEvents.flatMap((event) => {
    const stopRaw = event.tour_stops;
    const stop = Array.isArray(stopRaw) ? stopRaw[0] : stopRaw;
    const citiesRaw = stop?.cities;
    const city = Array.isArray(citiesRaw) ? citiesRaw[0] : citiesRaw;
    const lat = (city as { latitude?: number } | null)?.latitude;
    const lng = (city as { longitude?: number } | null)?.longitude;
    if (lat == null || lng == null) return [];
    return [
      {
        lng,
        lat,
        weight: Math.max(100, event.viewer_count ?? 100),
        label: (city as { name?: string })?.name ?? stop?.tour_city ?? "Live",
      },
    ];
  });

  const activityFeed: TourActivityItem[] = [];
  for (const event of liveEvents.slice(0, 5)) {
    const artist = Array.isArray(event.artists) ? event.artists[0] : event.artists;
    const stopRaw = event.tour_stops;
    const stop = Array.isArray(stopRaw) ? stopRaw[0] : stopRaw;
    const city = stop?.tour_city ?? stop?.virtual_location_label ?? "the next city";
    if (artist) {
      activityFeed.push({
        id: `live-${event.id}`,
        message: `${artist.stage_name} just started in ${city}.`,
        href: `/artists/${artist.slug}/events/${event.slug}`,
      });
    }
  }

  let heroGlobeStops: GlobeTourStop[] = [];
  let showHeroRoute = false;

  const featuredLive = liveEvents[0];
  if (featuredLive) {
    const stopRaw = featuredLive.tour_stops;
    const stop = Array.isArray(stopRaw) ? stopRaw[0] : stopRaw;
    const tourId = (stop as { tour_id?: string } | undefined)?.tour_id;
    if (tourId) {
      const { data: allStops } = await supabase
        .from("tour_stops")
        .select(
          "scheduled_at, tour_city, virtual_location_label, cities(name, latitude, longitude, countries(code, name))"
        )
        .eq("tour_id", tourId)
        .order("stop_order", { ascending: true });
      if (allStops?.length) {
        const normalizedStops = allStops.map((s) => ({
          scheduled_at: s.scheduled_at,
          tour_city: s.tour_city,
          virtual_location_label: s.virtual_location_label,
          cities: Array.isArray(s.cities) ? s.cities[0] : s.cities,
        }));
        const routeStops = mapStopsToRouteStatus(normalizedStops);
        heroGlobeStops = buildGlobeStopsFromTourStops(normalizedStops, routeStops);
        showHeroRoute = heroGlobeStops.length > 1;
      }
    }
  }

  const tourSections = publishedTours
    .map((t) => normalizeTourRow(t as Record<string, unknown>))
    .filter(Boolean) as HomepageTourSection[];

  const cityCounts = new Map<string, number>();
  for (const row of cityStopsRes.data ?? []) {
    const citiesRaw = row.cities;
    const city = Array.isArray(citiesRaw) ? citiesRaw[0] : citiesRaw;
    const name = (city as { name?: string } | null)?.name ?? row.tour_city;
    if (name) cityCounts.set(name, (cityCounts.get(name) ?? 0) + 1);
  }
  const popularCities = [...cityCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([city, stops]) => ({ city, stops }));

  const arenaMap = new Map<string, { name: string; slug: string }>();
  for (const row of activeVenuesRes.data ?? []) {
    const venueRaw = row.venues;
    const venue = Array.isArray(venueRaw) ? venueRaw[0] : venueRaw;
    if (venue && typeof venue === "object" && "slug" in venue) {
      const v = venue as { id: string; slug: string; name: string };
      arenaMap.set(v.id, { name: v.name, slug: v.slug });
    }
  }
  const popularArenas = [...arenaMap.values()].slice(0, 6).map((v) => ({
    ...v,
    events: 0,
  }));

  const nowMs = now.getTime();
  const toursStartingSoon = tourSections
    .filter((t) => t.startsAt && new Date(t.startsAt).getTime() > nowMs)
    .sort((a, b) => new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime())
    .slice(0, 6);

  const mostFollowedTours = [...tourSections]
    .sort((a, b) => (b.followerCount ?? 0) - (a.followerCount ?? 0))
    .slice(0, 6);

  const trendingTours = [...tourSections].slice(0, 6);

  const liveTours: HomepageTourSection[] = liveEvents
    .map((e) => {
      const artist = Array.isArray(e.artists) ? e.artists[0] : e.artists;
      const stopRaw = e.tour_stops;
      const stop = Array.isArray(stopRaw) ? stopRaw[0] : stopRaw;
      if (!artist) return null;
      return {
        id: e.id,
        title: e.title,
        slug: e.slug,
        artistName: artist.stage_name,
        artistSlug: artist.slug,
        city: stop?.tour_city ?? stop?.virtual_location_label ?? undefined,
      };
    })
    .filter(Boolean) as HomepageTourSection[];

  const completedTours = (completedToursRes.data ?? [])
    .map((t) => normalizeTourRow(t as Record<string, unknown>))
    .filter(Boolean) as HomepageTourSection[];

  return {
    stats,
    activityFeed,
    heatPoints,
    heroGlobeStops,
    showHeroRoute,
    hasLiveActivity: true,
    liveTours,
    toursStartingSoon,
    trendingTours,
    mostFollowedTours,
    completedTours,
    popularCities,
    popularArenas,
    passportStamps: popularCities.slice(0, 5).map((c) => c.city),
  };
}
