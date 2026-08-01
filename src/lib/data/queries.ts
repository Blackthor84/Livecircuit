import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import {
  countPublicArtists,
  isPublicArtistBySlug,
  isPublicArtistUser,
  isPublicProfile,
  PUBLIC_ARTIST_EVENT_SELECT,
  PUBLIC_ARTIST_LIST_SELECT,
  PUBLIC_ARTIST_PROFILE_SELECT,
  PUBLIC_TOUR_SELECT,
  filterRowsByPublicProfile,
} from "@/lib/testing/public-filter";
import type { ArtistWithProfile } from "@/types/queries";
import type { Artist, Tour, TourStop } from "@/types/database";

export type { ArtistWithProfile };

export const FOUNDING_ARTIST_GOAL = 100;

async function getSupabaseOrNull() {
  if (!isSupabaseConfigured()) return null;
  return createClient();
}

export async function getPublicArtistCount(): Promise<number> {
  const supabase = await getSupabaseOrNull();
  if (!supabase) return 0;
  return countPublicArtists(supabase);
}

export async function getFeaturedArtists(limit = 8): Promise<ArtistWithProfile[]> {
  const supabase = await getSupabaseOrNull();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("artists")
    .select(PUBLIC_ARTIST_LIST_SELECT)
    .eq("profiles.is_test_account", false)
    .order("featured", { ascending: false })
    .order("verified", { ascending: false })
    .order("follower_count", { ascending: false })
    .limit(limit);

  if (error || !data?.length) return [];
  return filterRowsByPublicProfile(data) as ArtistWithProfile[];
}

export async function getLiveNowEvents(limit = 8) {
  const supabase = await getSupabaseOrNull();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("events")
    .select(PUBLIC_ARTIST_EVENT_SELECT)
    .eq("status", "live")
    .eq("artists.profiles.is_test_account", false)
    .order("viewer_count", { ascending: false })
    .limit(limit);

  if (error || !data?.length) return [];
  return data;
}

export async function getArtistBySlug(slug: string) {
  const supabase = await getSupabaseOrNull();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("artists")
    .select(PUBLIC_ARTIST_PROFILE_SELECT)
    .eq("slug", slug)
    .eq("profiles.is_test_account", false)
    .maybeSingle();

  if (error || !data) return null;
  return data as ArtistWithProfile;
}

export async function getArtistTours(artistSlug: string, limit = 6) {
  const supabase = await getSupabaseOrNull();
  if (!supabase) return [];

  const publicArtist = await isPublicArtistBySlug(supabase, artistSlug);
  if (!publicArtist) return [];

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("slug", artistSlug)
    .maybeSingle();
  if (!artist) return [];

  const { data } = await supabase
    .from("tours")
    .select("*, artists(slug, stage_name, banner_url)")
    .eq("artist_id", artist.id)
    .eq("status", "published")
    .order("starts_at", { ascending: true })
    .limit(limit);

  return data ?? [];
}

export async function getArtistEvents(artistSlug: string, limit = 10) {
  const supabase = await getSupabaseOrNull();
  if (!supabase) return [];

  const publicArtist = await isPublicArtistBySlug(supabase, artistSlug);
  if (!publicArtist) return [];

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("slug", artistSlug)
    .maybeSingle();
  if (!artist) return [];

  const { data } = await supabase
    .from("events")
    .select(PUBLIC_ARTIST_EVENT_SELECT)
    .eq("artist_id", artist.id)
    .eq("artists.profiles.is_test_account", false)
    .in("status", ["scheduled", "live"])
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  return data ?? [];
}

export async function getUpcomingEvents(limit = 12) {
  const supabase = await getSupabaseOrNull();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("events")
    .select(PUBLIC_ARTIST_EVENT_SELECT)
    .eq("artists.profiles.is_test_account", false)
    .in("status", ["scheduled", "live"])
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (error || !data?.length) return [];
  return data;
}

export async function getEventBySlug(artistSlug: string, eventSlug: string) {
  const supabase = await getSupabaseOrNull();
  if (!supabase) return null;

  const publicArtist = await isPublicArtistBySlug(supabase, artistSlug);
  if (!publicArtist) return null;

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("slug", artistSlug)
    .maybeSingle();
  if (!artist) return null;

  const { data } = await supabase
    .from("events")
    .select(`*, streams(*), artists(*), tour_stops(*, tours(title, slug)), venues(slug, name, display_name, default_name, sponsored_name)`)
    .eq("artist_id", artist.id)
    .eq("slug", eventSlug)
    .maybeSingle();

  return data;
}

export async function getPublishedTours(limit = 6) {
  const supabase = await getSupabaseOrNull();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("tours")
    .select(PUBLIC_TOUR_SELECT)
    .eq("status", "published")
    .eq("artists.profiles.is_test_account", false)
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (error || !data?.length) return [];
  return data as (Tour & { artists: Artist })[];
}

export async function getTourWithStops(artistSlug: string, tourSlug: string) {
  const supabase = await getSupabaseOrNull();
  if (!supabase) return null;

  const publicArtist = await isPublicArtistBySlug(supabase, artistSlug);
  if (!publicArtist) return null;

  const { data: artist } = await supabase
    .from("artists")
    .select("id, slug, stage_name")
    .eq("slug", artistSlug)
    .maybeSingle();
  if (!artist) return null;

  const { data: tour } = await supabase
    .from("tours")
    .select("*")
    .eq("artist_id", artist.id)
    .eq("slug", tourSlug)
    .maybeSingle();
  if (!tour) return null;

  const { data: stops } = await supabase
    .from("tour_stops")
    .select("*, cities(name, slug)")
    .eq("tour_id", tour.id)
    .order("stop_order", { ascending: true });

  return {
    artist,
    tour: tour as Tour,
    stops: (stops ?? []) as (TourStop & { cities: { name: string; slug: string } | null })[],
  };
}

export async function searchCatalog(query: string) {
  const supabase = await getSupabaseOrNull();
  if (!supabase) {
    return { artists: [], events: [], tours: [], tourStops: [] };
  }

  const q = `%${query.trim()}%`;
  const [artistsByStage, artistsByUsername, artistsByCategory, artistsByCity, events, tours, tourStops] =
    await Promise.all([
      supabase
        .from("artists")
        .select(
          "id, slug, stage_name, category, verified, banner_url, profiles!inner(username, display_name, cities(name), is_test_account)"
        )
        .eq("profiles.is_test_account", false)
        .ilike("stage_name", q)
        .limit(10),
      supabase
        .from("profiles")
        .select("username, display_name, is_test_account, artists(id, slug, stage_name, category, verified, banner_url)")
        .eq("is_test_account", false)
        .not("username", "is", null)
        .or(`username.ilike.${q},display_name.ilike.${q}`)
        .limit(10),
      supabase
        .from("artists")
        .select(
          "id, slug, stage_name, category, verified, banner_url, profiles!inner(username, display_name, cities(name), is_test_account)"
        )
        .eq("profiles.is_test_account", false)
        .ilike("category", q)
        .limit(10),
      supabase
        .from("profiles")
        .select("username, display_name, cities(name), is_test_account, artists(id, slug, stage_name, category, verified, banner_url)")
        .eq("is_test_account", false)
        .not("username", "is", null)
        .filter("cities.name", "ilike", q)
        .limit(10),
      supabase
        .from("events")
        .select(
          "id, slug, title, scheduled_at, artists!inner(slug, stage_name, profiles!inner(username, is_test_account))"
        )
        .eq("artists.profiles.is_test_account", false)
        .ilike("title", q)
        .limit(10),
      supabase
        .from("tours")
        .select(
          "id, slug, title, status, starts_at, artists!inner(slug, stage_name, profiles!inner(username, is_test_account))"
        )
        .eq("artists.profiles.is_test_account", false)
        .eq("status", "published")
        .ilike("title", q)
        .limit(10),
      supabase
        .from("tour_stops")
        .select(
          `
          id, tour_city, virtual_location_label, scheduled_at,
          tours!inner(id, slug, title, status, artists!inner(slug, stage_name, profiles!inner(username, is_test_account)))
        `
        )
        .eq("tours.status", "published")
        .eq("tours.artists.profiles.is_test_account", false)
        .or(`tour_city.ilike.${q},virtual_location_label.ilike.${q}`)
        .limit(10),
    ]);

  type SearchArtist = {
    id: string;
    slug: string;
    stage_name: string;
    category: string;
    verified?: boolean;
    banner_url?: string | null;
    profiles?: { username?: string | null; display_name?: string | null; cities?: { name: string } | null } | null;
  };

  const merged = new Map<string, SearchArtist>();

  for (const row of artistsByStage.data ?? []) {
    merged.set(row.id as string, row as SearchArtist);
  }
  for (const row of artistsByCategory.data ?? []) {
    merged.set(row.id as string, row as SearchArtist);
  }
  for (const row of [...(artistsByUsername.data ?? []), ...(artistsByCity.data ?? [])]) {
    if (!isPublicProfile(row)) continue;
    const artist = row.artists as SearchArtist | SearchArtist[] | null;
    const list = Array.isArray(artist) ? artist : artist ? [artist] : [];
    for (const a of list) {
      merged.set(a.id, {
        ...a,
        profiles: {
          username: row.username as string,
          display_name: row.display_name as string,
          cities: (row as { cities?: { name: string } }).cities ?? null,
        },
      });
    }
  }

  type SearchTour = {
    id: string;
    slug: string;
    title: string;
    status: string;
    starts_at: string | null;
    artists: { slug: string; stage_name: string; profiles?: { username?: string | null } | null };
  };

  type SearchTourStop = {
    id: string;
    tour_city: string | null;
    virtual_location_label: string | null;
    scheduled_at: string;
    tours: SearchTour;
  };

  function normalizeSearchTour(row: Record<string, unknown>): SearchTour {
    const artistsRaw = row.artists;
    const artist = Array.isArray(artistsRaw) ? artistsRaw[0] : artistsRaw;
    const profilesRaw = (artist as { profiles?: unknown })?.profiles;
    const profile = Array.isArray(profilesRaw) ? profilesRaw[0] : profilesRaw;
    return {
      id: row.id as string,
      slug: row.slug as string,
      title: row.title as string,
      status: row.status as string,
      starts_at: (row.starts_at as string | null) ?? null,
      artists: {
        slug: (artist as { slug: string }).slug,
        stage_name: (artist as { stage_name: string }).stage_name,
        profiles: profile as { username?: string | null } | null,
      },
    };
  }

  function normalizeSearchTourStop(row: Record<string, unknown>): SearchTourStop {
    const toursRaw = row.tours;
    const tourRow = Array.isArray(toursRaw) ? toursRaw[0] : toursRaw;
    return {
      id: row.id as string,
      tour_city: (row.tour_city as string | null) ?? null,
      virtual_location_label: (row.virtual_location_label as string | null) ?? null,
      scheduled_at: row.scheduled_at as string,
      tours: normalizeSearchTour(tourRow as Record<string, unknown>),
    };
  }

  const tourResults = (tours.data ?? []).map((row) => normalizeSearchTour(row as Record<string, unknown>));
  const stopResults = (tourStops.data ?? []).map((row) =>
    normalizeSearchTourStop(row as Record<string, unknown>)
  );

  return {
    artists: [...merged.values()].slice(0, 10),
    tours: tourResults,
    tourStops: stopResults,
    events: events.data ?? [],
  };
}

export async function getFanHeatMap(artistId: string) {
  const supabase = await getSupabaseOrNull();
  if (!supabase) return [];

  const { data: artist } = await supabase.from("artists").select("user_id").eq("id", artistId).maybeSingle();
  if (!artist || !(await isPublicArtistUser(supabase, artist.user_id as string))) return [];

  const { data } = await supabase
    .from("artist_fan_locations")
    .select("*")
    .eq("artist_id", artistId);

  return data ?? [];
}

export async function getArtistProducts(artistSlug: string, limit = 12) {
  const supabase = await getSupabaseOrNull();
  if (!supabase) return null;

  const publicArtist = await isPublicArtistBySlug(supabase, artistSlug);
  if (!publicArtist) return [];

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("slug", artistSlug)
    .maybeSingle();
  if (!artist) return [];

  const { data } = await supabase
    .from("products")
    .select("id, slug, name, price_cents, image_urls, active")
    .eq("artist_id", artist.id)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}
