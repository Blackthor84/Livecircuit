import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import {
  demoArtists,
  demoEvents,
  demoTourStops,
  demoTours,
} from "@/lib/data/demo";
import type { ArtistWithProfile } from "@/types/queries";
import type { Artist, Tour, TourStop } from "@/types/database";

export type { ArtistWithProfile };

async function getSupabaseOrNull() {
  if (!isSupabaseConfigured()) return null;
  return createClient();
}

export async function getFeaturedArtists(limit = 8): Promise<ArtistWithProfile[]> {
  const supabase = await getSupabaseOrNull();
  if (!supabase) return demoArtists.slice(0, limit);

  const { data, error } = await supabase
    .from("artists")
    .select("*, profiles(display_name, avatar_url)")
    .order("follower_count", { ascending: false })
    .limit(limit);

  if (error || !data?.length) return demoArtists.slice(0, limit);
  return data as ArtistWithProfile[];
}

export async function getArtistBySlug(slug: string) {
  const supabase = await getSupabaseOrNull();
  if (!supabase) {
    return demoArtists.find((a) => a.slug === slug) ?? null;
  }

  const { data, error } = await supabase
    .from("artists")
    .select("*, profiles(display_name, avatar_url, bio)")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return demoArtists.find((a) => a.slug === slug) ?? null;
  }
  return data as ArtistWithProfile;
}

export async function getArtistTours(artistSlug: string, limit = 6) {
  const supabase = await getSupabaseOrNull();
  if (!supabase) {
    return demoTours.filter((t) => t.artists?.slug === artistSlug).slice(0, limit);
  }

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
  if (!supabase) {
    return demoEvents.filter((e) => e.artists?.slug === artistSlug).slice(0, limit);
  }

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("slug", artistSlug)
    .maybeSingle();
  if (!artist) return [];

  const { data } = await supabase
    .from("events")
    .select(
      `*, artists(slug, stage_name, banner_url, verified), tour_stops(virtual_location_label, ticket_price_cents, banner_url)`
    )
    .eq("artist_id", artist.id)
    .in("status", ["scheduled", "live"])
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  return data ?? [];
}

export async function getUpcomingEvents(limit = 12) {
  const supabase = await getSupabaseOrNull();
  if (!supabase) return demoEvents.slice(0, limit);

  const { data, error } = await supabase
    .from("events")
    .select(
      `*, artists(slug, stage_name, banner_url, verified), tour_stops(virtual_location_label, ticket_price_cents, banner_url)`
    )
    .in("status", ["scheduled", "live"])
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (error || !data?.length) return demoEvents.slice(0, limit);
  return data;
}

export async function getEventBySlug(artistSlug: string, eventSlug: string) {
  const supabase = await getSupabaseOrNull();
  if (!supabase) {
    return (
      demoEvents.find((e) => e.slug === eventSlug && e.artists?.slug === artistSlug) ?? null
    );
  }

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("slug", artistSlug)
    .maybeSingle();
  if (!artist) {
    return (
      demoEvents.find((e) => e.slug === eventSlug && e.artists?.slug === artistSlug) ?? null
    );
  }

  const { data } = await supabase
    .from("events")
    .select(`*, streams(*), artists(*), tour_stops(*), venues(slug, name)`)
    .eq("artist_id", artist.id)
    .eq("slug", eventSlug)
    .maybeSingle();

  return data;
}

export async function getPublishedTours(limit = 6) {
  const supabase = await getSupabaseOrNull();
  if (!supabase) return demoTours.slice(0, limit);

  const { data, error } = await supabase
    .from("tours")
    .select("*, artists(slug, stage_name, banner_url)")
    .eq("status", "published")
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (error || !data?.length) return demoTours.slice(0, limit);
  return data as (Tour & { artists: Artist })[];
}

export async function getTourWithStops(artistSlug: string, tourSlug: string) {
  const supabase = await getSupabaseOrNull();
  if (!supabase) {
    const tour = demoTours.find((t) => t.slug === tourSlug && t.artists?.slug === artistSlug);
    if (!tour) return null;
    return {
      artist: { id: "1", slug: artistSlug, stage_name: tour.artists?.stage_name ?? "" },
      tour,
      stops: demoTourStops.filter((s) => s.tour_id === tour.id) as (TourStop & {
        cities: { name: string; slug: string } | null;
      })[],
    };
  }

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
    const q = query.toLowerCase();
    return {
      artists: demoArtists.filter(
        (a) =>
          a.stage_name.toLowerCase().includes(q) ||
          a.slug.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
      ),
      events: demoEvents.filter((e) => e.title.toLowerCase().includes(q)),
    };
  }

  const q = `%${query.trim()}%`;
  const [artistsByStage, artistsByUsername, artistsByCategory, artistsByCity, events] =
    await Promise.all([
      supabase
        .from("artists")
        .select("id, slug, stage_name, category, verified, banner_url, profiles(username, display_name, cities(name))")
        .ilike("stage_name", q)
        .limit(10),
      supabase
        .from("profiles")
        .select("username, display_name, artists(id, slug, stage_name, category, verified, banner_url)")
        .not("username", "is", null)
        .or(`username.ilike.${q},display_name.ilike.${q}`)
        .limit(10),
      supabase
        .from("artists")
        .select("id, slug, stage_name, category, verified, banner_url, profiles(username, display_name, cities(name))")
        .ilike("category", q)
        .limit(10),
      supabase
        .from("profiles")
        .select("username, display_name, cities(name), artists(id, slug, stage_name, category, verified, banner_url)")
        .not("username", "is", null)
        .filter("cities.name", "ilike", q)
        .limit(10),
      supabase
        .from("events")
        .select("id, slug, title, scheduled_at, artists(slug, stage_name, profiles(username))")
        .ilike("title", q)
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

  return { artists: [...merged.values()].slice(0, 10), events: events.data ?? [] };
}

export async function getFanHeatMap(artistId: string) {
  const supabase = await getSupabaseOrNull();
  if (!supabase) return [];

  const { data } = await supabase
    .from("artist_fan_locations")
    .select("*")
    .eq("artist_id", artistId);

  return data ?? [];
}

export async function getArtistProducts(artistSlug: string, limit = 12) {
  const supabase = await getSupabaseOrNull();
  if (!supabase) return null;

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
