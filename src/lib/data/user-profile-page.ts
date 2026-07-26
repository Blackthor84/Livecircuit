import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { getFollowingArtists, getUserTickets } from "@/lib/data/profiles";
import { getGenres } from "@/lib/data/locations";
import type { UserRole } from "@/types/database";

export type UserProfilePageData = {
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
  role: UserRole;
  bio: string | null;
  followerCount: number;
  followingCount: number;
  favoriteGenres: string[];
  recentlyWatched: {
    id: string;
    title: string;
    artistName: string;
    href: string;
    scheduledAt: string;
  }[];
  likedArtists: {
    slug: string;
    stageName: string;
    bannerUrl: string | null;
    verified: boolean;
    category: string;
  }[];
};

export async function getUserProfilePageData(userId: string): Promise<UserProfilePageData | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileRes, followingCountRes, artistRes, tickets, following, genres] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("followers").select("id", { count: "exact", head: true }).eq("fan_id", userId),
    supabase.from("artists").select("follower_count").eq("user_id", userId).maybeSingle(),
    getUserTickets(userId, 6),
    getFollowingArtists(userId, 8),
    getGenres(),
  ]);

  const profile = profileRes.data;
  if (!profile) return null;

  const genreIds = (profile.favorite_genres as string[] | null) ?? [];
  const genreMap = new Map(genres.map((g) => [g.id, g.name]));
  const favoriteGenres = genreIds.map((id) => genreMap.get(id) ?? id).filter(Boolean);

  const recentlyWatched = tickets
    .map((ticket) => {
      const raw = ticket.events;
      const event = (Array.isArray(raw) ? raw[0] : raw) as {
        id?: string;
        slug?: string;
        title?: string;
        scheduled_at?: string;
        artists?: { slug?: string; stage_name?: string } | { slug?: string; stage_name?: string }[] | null;
      } | null;
      if (!event?.slug || !event.title || !event.scheduled_at) return null;
      const artistRaw = event.artists;
      const artist = Array.isArray(artistRaw) ? artistRaw[0] : artistRaw;
      if (!artist?.slug || !artist.stage_name) return null;
      return {
        id: String(ticket.id),
        title: event.title,
        artistName: artist.stage_name,
        href: `/artists/${artist.slug}/events/${event.slug}`,
        scheduledAt: event.scheduled_at,
      };
    })
    .filter(Boolean) as UserProfilePageData["recentlyWatched"];

  const likedArtists = following
    .map((row) => {
      const artist = row as {
        slug?: string;
        stage_name?: string;
        banner_url?: string | null;
        verified?: boolean;
        category?: string;
      };
      if (!artist.slug || !artist.stage_name) return null;
      return {
        slug: artist.slug,
        stageName: artist.stage_name,
        bannerUrl: artist.banner_url ?? null,
        verified: artist.verified ?? false,
        category: artist.category ?? "music",
      };
    })
    .filter(Boolean) as UserProfilePageData["likedArtists"];

  return {
    displayName: profile.display_name,
    email: user.email ?? "",
    avatarUrl: profile.avatar_url,
    role: profile.role as UserRole,
    bio: profile.bio,
    followerCount: artistRes.data?.follower_count ?? 0,
    followingCount: followingCountRes.count ?? 0,
    favoriteGenres,
    recentlyWatched,
    likedArtists,
  };
}
