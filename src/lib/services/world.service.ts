import type { SupabaseClient } from "@supabase/supabase-js";
import { COUNTRY_CENTROIDS } from "@/lib/maps/heat-types";
import { approximateLocalTime } from "@/lib/services/world-zoom";
import type {
  WorldFestivalPin,
  WorldReport,
  WorldTrendingRegion,
  WorldVenueMarker,
} from "@/lib/types/world";
import { listFestivalsHub } from "@/lib/services/virtual-festivals.service";

type VenueRow = {
  id: string;
  slug: string;
  name: string;
  region: string;
  state_code: string | null;
  current_visitors: number;
  popularity_score: number;
  weather_placeholder: Record<string, unknown> | null;
  cities: { name: string; latitude: number | null; longitude: number | null } | null;
  countries: { code: string; name: string } | null;
  states: { code: string; name: string } | null;
  venue_types: { slug: string; name: string } | null;
};

function firstJoin<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function coordsForVenue(row: VenueRow): { lat: number; lng: number } | null {
  const city = firstJoin(row.cities);
  if (city?.latitude != null && city.longitude != null) {
    return { lat: city.latitude, lng: city.longitude };
  }
  const country = firstJoin(row.countries);
  if (country?.code && COUNTRY_CENTROIDS[country.code]) {
    const c = COUNTRY_CENTROIDS[country.code];
    return { lat: c.lat, lng: c.lng };
  }
  return null;
}

function weatherSummary(row: VenueRow): string | null {
  const w = row.weather_placeholder;
  if (w && typeof w.summary === "string") return w.summary;
  return "Clear · 72°F (placeholder)";
}

export async function syncWorldTrendingRegions(supabase: SupabaseClient, markers: WorldVenueMarker[]) {
  const byRegion = new Map<string, WorldTrendingRegion>();

  for (const m of markers) {
    const key = m.stateCode ? `state:${m.stateCode}` : m.countryCode ? `country:${m.countryCode}` : `venue:${m.slug}`;
    const label = m.stateCode
      ? `${m.stateCode} circuit`
      : m.countryName ?? m.cityName ?? m.name;
    const cur =
      byRegion.get(key) ??
      ({
        regionKey: key,
        label,
        countryCode: m.countryCode,
        stateCode: m.stateCode,
        lat: m.lat,
        lng: m.lng,
        venueCount: 0,
        liveEventCount: 0,
        attendanceScore: 0,
      } satisfies WorldTrendingRegion);

    cur.venueCount += 1;
    cur.liveEventCount += m.liveEventCount;
    cur.attendanceScore += m.attendanceScore;
    byRegion.set(key, cur);
  }

  const top = [...byRegion.values()].sort((a, b) => b.attendanceScore - a.attendanceScore).slice(0, 12);

  for (const region of top) {
    await supabase.from("livecircuit_world_trending_regions").upsert(
      {
        region_key: region.regionKey,
        label: region.label,
        country_code: region.countryCode,
        state_code: region.stateCode,
        latitude: region.lat,
        longitude: region.lng,
        venue_count: region.venueCount,
        live_event_count: region.liveEventCount,
        attendance_score: region.attendanceScore,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "region_key" }
    );
  }
}

async function loadTrending(supabase: SupabaseClient, fallback: WorldTrendingRegion[]) {
  const { data } = await supabase
    .from("livecircuit_world_trending_regions")
    .select("*")
    .order("attendance_score", { ascending: false })
    .limit(12);

  if (!data?.length) return fallback;

  return data.map(
    (r): WorldTrendingRegion => ({
      regionKey: r.region_key as string,
      label: r.label as string,
      countryCode: (r.country_code as string | null) ?? null,
      stateCode: (r.state_code as string | null) ?? null,
      lat: r.latitude as number,
      lng: r.longitude as number,
      venueCount: r.venue_count as number,
      liveEventCount: r.live_event_count as number,
      attendanceScore: Number(r.attendance_score),
    })
  );
}

const FESTIVAL_PIN_COORDS: Record<string, { lat: number; lng: number }> = {
  "livecircuit-summer-fest": { lat: 40.7128, lng: -74.006 },
  "comedy-weekend": { lat: 34.0522, lng: -118.2437 },
  "edm-world": { lat: 36.1699, lng: -115.1398 },
  "country-music-festival": { lat: 36.1627, lng: -86.7816 },
};

async function festivalPins(supabase: SupabaseClient): Promise<WorldFestivalPin[]> {
  const hub = await listFestivalsHub(supabase);
  const items = [...hub.live, ...hub.upcoming].slice(0, 6);
  return items.map((f) => {
    const coords = FESTIVAL_PIN_COORDS[f.slug] ?? { lat: 51.5074, lng: -0.1278 };
    return {
      slug: f.slug,
      name: f.name,
      status: f.status,
      lat: coords.lat,
      lng: coords.lng,
      href: `/festivals/${f.slug}`,
      tagline: f.tagline,
    };
  });
}

export async function buildWorldReport(supabase: SupabaseClient, admin: SupabaseClient): Promise<WorldReport> {
  const { data: venueRows } = await supabase
    .from("venues")
    .select(
      `
      id, slug, name, region, state_code, current_visitors, popularity_score, weather_placeholder,
      cities(name, latitude, longitude),
      countries(code, name),
      states(code, name),
      venue_types(slug, name)
    `
    )
    .eq("is_active", true)
    .limit(400);

  const venues = (venueRows ?? []) as unknown as VenueRow[];
  const venueIds = venues.map((v) => v.id);

  const { data: liveEvents } = venueIds.length
    ? await supabase
        .from("events")
        .select("id, slug, venue_id, viewer_count, artist_id, artists(category, slug)")
        .eq("status", "live")
        .in("venue_id", venueIds)
    : { data: [] };

  const liveByVenue = new Map<
    string,
    { count: number; viewers: number; category: string | null; eventSlug: string | null; artistSlug: string | null }
  >();

  for (const ev of liveEvents ?? []) {
    const vid = ev.venue_id as string;
    const artist = firstJoin(ev.artists as { category: string; slug: string } | { category: string; slug: string }[]);
    const cur = liveByVenue.get(vid) ?? {
      count: 0,
      viewers: 0,
      category: null,
      eventSlug: null,
      artistSlug: null,
    };
    cur.count += 1;
    cur.viewers += (ev.viewer_count as number) ?? 0;
    if (!cur.eventSlug) {
      cur.eventSlug = ev.slug as string;
      cur.artistSlug = artist?.slug ?? null;
      cur.category = artist?.category ?? null;
    }
    liveByVenue.set(vid, cur);
  }

  const markers: WorldVenueMarker[] = [];
  for (const row of venues) {
    const coords = coordsForVenue(row);
    if (!coords) continue;

    const live = liveByVenue.get(row.id);
    const country = firstJoin(row.countries);
    const city = firstJoin(row.cities);
    const vtype = firstJoin(row.venue_types);
    const categories: string[] = [];
    if (live?.category) categories.push(live.category);
    if (vtype?.slug === "comedy-club") categories.push("comedy");

    markers.push({
      id: row.id,
      slug: row.slug,
      name: row.name,
      lat: coords.lat,
      lng: coords.lng,
      countryCode: country?.code ?? null,
      countryName: country?.name ?? null,
      stateCode: row.state_code,
      cityName: city?.name ?? null,
      venueTypeSlug: vtype?.slug ?? null,
      isLive: Boolean(live && live.count > 0),
      liveEventCount: live?.count ?? 0,
      currentVisitors: row.current_visitors,
      attendanceScore: (live?.viewers ?? 0) + row.current_visitors + Number(row.popularity_score),
      weatherSummary: weatherSummary(row),
      localTimeLabel: approximateLocalTime(coords.lng),
      categories,
      isFestivalHub: Number(row.popularity_score) > 500,
      featuredLiveEventSlug: live?.eventSlug ?? null,
      featuredLiveArtistSlug: live?.artistSlug ?? null,
      venueHref: `/livecircuit/venues/${row.slug}`,
      concourseHref: `/livecircuit/venues/${row.slug}/concourse`,
    });
  }

  const trendingFallback = [...markers]
    .sort((a, b) => b.attendanceScore - a.attendanceScore)
    .slice(0, 8)
    .map(
      (m): WorldTrendingRegion => ({
        regionKey: m.stateCode ? `state:${m.stateCode}` : `venue:${m.slug}`,
        label: m.cityName ?? m.name,
        countryCode: m.countryCode,
        stateCode: m.stateCode,
        lat: m.lat,
        lng: m.lng,
        venueCount: 1,
        liveEventCount: m.liveEventCount,
        attendanceScore: m.attendanceScore,
      })
    );

  await syncWorldTrendingRegions(admin, markers);
  const trending = await loadTrending(supabase, trendingFallback);
  const festivals = await festivalPins(supabase);

  const liveVenues = markers.filter((m) => m.isLive).length;
  const totalLiveEvents = markers.reduce((s, m) => s + m.liveEventCount, 0);
  const densityLabel =
    markers.length >= 80 ? "High venue density" : markers.length >= 25 ? "Growing circuit" : "Emerging regions";

  return {
    markers,
    trending,
    festivals,
    totals: {
      venues: markers.length,
      liveVenues,
      liveEvents: totalLiveEvents,
      densityLabel,
    },
    zoomLevel: "earth",
    computedAt: new Date().toISOString(),
  };
}
