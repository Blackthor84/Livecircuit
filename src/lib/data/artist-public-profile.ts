import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { demoArtists, demoEvents } from "@/lib/data/demo";
import { getUsernameRedirectTarget } from "@/lib/actions/username";
import { normalizeUsername } from "@/lib/username";
import type { ArtistCategory, Product } from "@/types/database";
import type { ArtistWithProfile } from "@/types/queries";

export type ArtistProfileLocation = {
  city: string | null;
  state: string | null;
  stateCode: string | null;
};

export type ArtistPublicEvent = {
  id: string;
  slug: string;
  title: string;
  status: string;
  scheduled_at: string;
  viewer_count: number;
  peak_viewers: number;
  venue_name: string | null;
  venue_slug: string | null;
  stage: string | null;
  thumbnail: string | null;
  ticket_price_cents: number;
};

export type ArtistPublicReview = {
  id: string;
  rating: number;
  body: string | null;
  created_at: string;
  reviewer_name: string;
};

export type ArtistPublicMedia = {
  id: string;
  title: string;
  url: string;
  thumbnail_url: string | null;
  media_type: string;
};

export type ArtistPublicStats = {
  followers: number;
  totalPerformances: number;
  totalHoursStreamed: number;
  totalViews: number;
  peakLiveViewers: number;
  averageRating: number | null;
  reviewCount: number;
  memberSince: string;
};

export type ArtistPublicProfile = {
  artist: ArtistWithProfile & {
    username: string;
    short_bio: string | null;
    years_performing: number | null;
    languages: string[];
    booking_email: string | null;
    location: ArtistProfileLocation;
  };
  genres: { id: string; name: string; slug: string }[];
  stats: ArtistPublicStats;
  upcomingEvents: ArtistPublicEvent[];
  pastEvents: ArtistPublicEvent[];
  liveEvent: ArtistPublicEvent | null;
  featuredVideos: ArtistPublicMedia[];
  galleryMedia: ArtistPublicMedia[];
  reviews: ArtistPublicReview[];
  products: Product[];
};

type ProfileRow = {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  username: string | null;
  created_at: string;
  cities: { name: string } | null;
  states: { name: string; code: string } | null;
};

type ArtistRow = ArtistWithProfile & {
  short_bio?: string | null;
  years_performing?: number | null;
  languages?: string[];
  booking_email?: string | null;
  created_at?: string;
  profiles: ProfileRow | null;
};

async function getSupabaseOrNull() {
  if (!isSupabaseConfigured()) return null;
  return createClient();
}

function buildLocation(profile: ProfileRow | null): ArtistProfileLocation {
  return {
    city: profile?.cities?.name ?? null,
    state: profile?.states?.name ?? null,
    stateCode: profile?.states?.code ?? null,
  };
}

function mapEvent(
  event: Record<string, unknown>,
  fallbackThumb?: string | null
): ArtistPublicEvent {
  const tourStop = event.tour_stops as { virtual_location_label?: string; banner_url?: string; ticket_price_cents?: number } | null;
  const venue = event.venues as { name?: string; slug?: string } | null;
  return {
    id: event.id as string,
    slug: event.slug as string,
    title: event.title as string,
    status: event.status as string,
    scheduled_at: event.scheduled_at as string,
    viewer_count: (event.viewer_count as number) ?? 0,
    peak_viewers: (event.peak_viewers as number) ?? 0,
    venue_name: venue?.name ?? tourStop?.virtual_location_label ?? null,
    venue_slug: venue?.slug ?? null,
    stage: (event.venue_room_label as string | null) ?? tourStop?.virtual_location_label ?? null,
    thumbnail: tourStop?.banner_url ?? fallbackThumb ?? null,
    ticket_price_cents: tourStop?.ticket_price_cents ?? 0,
  };
}

function buildDemoProfile(username: string): ArtistPublicProfile | null {
  const artist = demoArtists.find(
    (a) => a.slug === username || normalizeUsername(a.slug) === username
  );
  if (!artist) return null;

  const events = demoEvents.filter((e) => e.artists?.slug === artist.slug);
  const now = new Date();

  return {
    artist: {
      ...artist,
      username: artist.slug,
      short_bio: artist.profiles?.bio?.slice(0, 280) ?? null,
      years_performing: 5,
      languages: ["English"],
      booking_email: null,
      location: { city: "Los Angeles", state: "California", stateCode: "CA" },
    },
    genres: [{ id: "1", name: "Pop", slug: "pop" }],
    stats: {
      followers: artist.follower_count,
      totalPerformances: events.length,
      totalHoursStreamed: 42,
      totalViews: 125000,
      peakLiveViewers: 3200,
      averageRating: 4.8,
      reviewCount: 24,
      memberSince: new Date(Date.now() - 86400000 * 365).toISOString(),
    },
    upcomingEvents: events
      .filter((e) => new Date(e.scheduled_at) >= now)
      .map((e) =>
        mapEvent(e as unknown as Record<string, unknown>, artist.banner_url)
      ),
    pastEvents: events
      .filter((e) => new Date(e.scheduled_at) < now)
      .map((e) =>
        mapEvent(e as unknown as Record<string, unknown>, artist.banner_url)
      ),
    liveEvent: (() => {
      const live = events.find((e) => (e.status as string) === "live");
      return live ? mapEvent(live as unknown as Record<string, unknown>, artist.banner_url) : null;
    })(),
    featuredVideos: [],
    galleryMedia: [],
    reviews: [
      {
        id: "r1",
        rating: 5,
        body: "Incredible live energy — felt like being front row.",
        created_at: new Date().toISOString(),
        reviewer_name: "Alex M.",
      },
    ],
    products: [],
  };
}

export async function resolveArtistUsername(username: string): Promise<string> {
  const normalized = normalizeUsername(username);
  const redirect = await getUsernameRedirectTarget(normalized);
  if (redirect) return normalizeUsername(redirect);
  return normalized;
}

export async function getArtistPublicProfile(username: string): Promise<ArtistPublicProfile | null> {
  const normalized = normalizeUsername(username);
  const supabase = await getSupabaseOrNull();

  if (!supabase) {
    return buildDemoProfile(normalized);
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, bio, created_at, cities(name), states(name, code)"
    )
    .eq("username", normalized)
    .maybeSingle();

  let artistQuery = supabase
    .from("artists")
    .select("*")
    .eq("slug", normalized);

  if (profileRow) {
    artistQuery = supabase.from("artists").select("*").eq("user_id", profileRow.id);
  }

  const { data: artistRow } = await artistQuery.maybeSingle();
  if (!artistRow) return buildDemoProfile(normalized);

  const artistId = artistRow.id as string;
  const userId = artistRow.user_id as string;

  const [
    profileData,
    genreRows,
    mediaRows,
    productRows,
    upcomingRows,
    pastRows,
    liveRow,
    statsRows,
    reviewRows,
  ] = await Promise.all([
    profileRow
      ? Promise.resolve(profileRow)
      : supabase
          .from("profiles")
          .select(
            "id, username, display_name, avatar_url, bio, created_at, cities(name), states(name, code)"
          )
          .eq("id", userId)
          .maybeSingle()
          .then((r) => r.data),
    supabase
      .from("artist_genres")
      .select("genres(id, name, slug)")
      .eq("artist_id", artistId),
    supabase
      .from("artist_media")
      .select("*")
      .eq("artist_id", artistId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("products")
      .select("*")
      .eq("artist_id", artistId)
      .eq("active", true)
      .limit(8),
    supabase
      .from("events")
      .select(
        "*, tour_stops(virtual_location_label, ticket_price_cents, banner_url, expected_duration_minutes), venues(name, slug)"
      )
      .eq("artist_id", artistId)
      .in("status", ["scheduled", "live"])
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(8),
    supabase
      .from("events")
      .select(
        "*, tour_stops(virtual_location_label, ticket_price_cents, banner_url, expected_duration_minutes), venues(name, slug)"
      )
      .eq("artist_id", artistId)
      .eq("status", "ended")
      .order("scheduled_at", { ascending: false })
      .limit(12),
    supabase
      .from("events")
      .select(
        "*, tour_stops(virtual_location_label, ticket_price_cents, banner_url), venues(name, slug)"
      )
      .eq("artist_id", artistId)
      .eq("status", "live")
      .maybeSingle(),
    supabase
      .from("events")
      .select("viewer_count, peak_viewers, started_at, ended_at, tour_stops(expected_duration_minutes)")
      .eq("artist_id", artistId)
      .in("status", ["ended", "live"]),
    supabase
      .from("reviews")
      .select("id, rating, body, created_at, profiles(display_name, username)")
      .in(
        "event_id",
        (
          await supabase.from("events").select("id").eq("artist_id", artistId).limit(50)
        ).data?.map((e) => e.id) ?? []
      )
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const profile = profileData as ProfileRow | null;
  const genres = (genreRows.data ?? [])
    .map((row) => {
      const g = row.genres as unknown;
      if (Array.isArray(g)) return g[0] as { id: string; name: string; slug: string } | undefined;
      return g as { id: string; name: string; slug: string } | null;
    })
    .filter(Boolean) as { id: string; name: string; slug: string }[];

  const allStats = statsRows.data ?? [];
  const totalViews = allStats.reduce((sum, e) => sum + ((e.viewer_count as number) ?? 0), 0);
  const peakLiveViewers = allStats.reduce(
    (max, e) => Math.max(max, (e.peak_viewers as number) ?? 0),
    0
  );
  const totalHoursStreamed = Math.round(
    allStats.reduce((sum, e) => {
      const tourStop = e.tour_stops as { expected_duration_minutes?: number } | null;
      const minutes = tourStop?.expected_duration_minutes ?? 90;
      return sum + minutes / 60;
    }, 0)
  );

  const reviews = (reviewRows.data ?? []).map((r) => {
    const reviewer = r.profiles as { display_name?: string; username?: string } | null;
    return {
      id: r.id as string,
      rating: r.rating as number,
      body: r.body as string | null,
      created_at: r.created_at as string,
      reviewer_name: reviewer?.display_name ?? reviewer?.username ?? "Fan",
    };
  });

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

  const media = (mediaRows.data ?? []) as ArtistPublicMedia[];
  const row = artistRow as ArtistRow;

  return {
    artist: {
      ...row,
      profiles: profile
        ? {
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            bio: profile.bio,
          }
        : null,
      username: profile?.username ?? row.slug,
      short_bio: row.short_bio ?? profile?.bio?.slice(0, 280) ?? null,
      years_performing: row.years_performing ?? null,
      languages: row.languages ?? [],
      booking_email: row.booking_email ?? null,
      location: buildLocation(profile),
    },
    genres,
    stats: {
      followers: row.follower_count ?? 0,
      totalPerformances: allStats.length,
      totalHoursStreamed,
      totalViews,
      peakLiveViewers,
      averageRating: avgRating,
      reviewCount: reviews.length,
      memberSince: row.created_at ?? profile?.created_at ?? new Date().toISOString(),
    },
    upcomingEvents: (upcomingRows.data ?? [])
      .filter((e) => e.status !== "live")
      .map((e) => mapEvent(e as Record<string, unknown>, row.banner_url)),
    pastEvents: (pastRows.data ?? []).map((e) =>
      mapEvent(e as Record<string, unknown>, row.banner_url)
    ),
    liveEvent: liveRow.data
      ? mapEvent(liveRow.data as Record<string, unknown>, row.banner_url)
      : null,
    featuredVideos: media.filter((m) => m.media_type === "video"),
    galleryMedia: media.filter((m) => m.media_type !== "video"),
    reviews,
    products: (productRows.data ?? []) as Product[],
  };
}

export function getCategoryLabel(category: ArtistCategory): string {
  const labels: Record<ArtistCategory, string> = {
    music: "Musician",
    comedy: "Stand-Up Comedian",
    podcast: "Podcaster",
    author: "Author",
    gaming: "Gaming Creator",
    dj: "DJ",
    theater: "Theater Performer",
    magic: "Magician",
    fitness: "Fitness Instructor",
    cooking: "Chef",
    education: "Educator",
    religion: "Faith Leader",
    motivational: "Motivational Speaker",
    other: "Performer",
  };
  return labels[category] ?? "Performer";
}
