import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { getVenueBySlug } from "@/lib/data/venues";

export type VenueCommunityPost = {
  id: string;
  kind: "discussion" | "achievement" | "ranking";
  title: string | null;
  body: string;
  is_pinned: boolean;
  created_at: string;
  profiles: { display_name: string | null; avatar_url: string | null } | null;
};

export type VenueCommunityReview = {
  id: string;
  rating: number;
  body: string | null;
  created_at: string;
  profiles: { display_name: string | null } | null;
};

export type VenueCommunityPageData = {
  venue: {
    id: string;
    slug: string;
    name: string;
    region: string;
    follower_count: number;
  };
  following: boolean;
  posts: VenueCommunityPost[];
  postsTotal: number;
  reviewSummary: { average: number; count: number };
  reviews: VenueCommunityReview[];
  userReview: { id: string; rating: number; body: string | null } | null;
  announcements: {
    id: string;
    title: string;
    body: string;
    published_at: string;
  }[];
  leaderboard: { category: string; payload: unknown[] } | null;
};

async function getClient() {
  if (!isSupabaseConfigured()) return null;
  return createClient();
}

export async function listVenueCommunityPosts(
  venueId: string,
  options: { page?: number; limit?: number; cursor?: string } = {}
): Promise<{ items: VenueCommunityPost[]; total: number; nextCursor: string | null }> {
  const supabase = await getClient();
  if (!supabase) return { items: [], total: 0, nextCursor: null };

  const limit = Math.min(50, Math.max(1, options.limit ?? 20));

  if (options.cursor) {
    const { data, error } = await supabase
      .from("venue_posts")
      .select("id, kind, title, body, is_pinned, created_at, profiles(display_name, avatar_url)")
      .eq("venue_id", venueId)
      .eq("is_pinned", false)
      .lt("created_at", options.cursor)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return { items: [], total: 0, nextCursor: null };

    const items = (data ?? []) as unknown as VenueCommunityPost[];
    const nextCursor =
      items.length === limit ? (items[items.length - 1]?.created_at ?? null) : null;

    return { items, total: items.length, nextCursor };
  }

  const page = Math.max(1, options.page ?? 1);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await supabase
    .from("venue_posts")
    .select(
      "id, kind, title, body, is_pinned, created_at, profiles(display_name, avatar_url)",
      { count: "exact" }
    )
    .eq("venue_id", venueId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return { items: [], total: 0, nextCursor: null };

  const items = (data ?? []) as unknown as VenueCommunityPost[];
  const nextCursor =
    page === 1 && items.length === limit
      ? (items.filter((p) => !p.is_pinned).at(-1)?.created_at ?? null)
      : null;

  return {
    items,
    total: count ?? 0,
    nextCursor,
  };
}

export async function getVenueCommunityPage(
  slug: string,
  userId?: string | null,
  options: { postsPage?: number; postsLimit?: number } = {}
): Promise<VenueCommunityPageData | null> {
  const base = await getVenueBySlug(slug);
  if (!base) return null;

  const supabase = await getClient();
  if (!supabase) return null;

  const venueId = base.id;

  const [postsResult, reviews, announcements, leaderboardRow, followingRow, userReviewRow] =
    await Promise.all([
      listVenueCommunityPosts(venueId, {
        page: options.postsPage ?? 1,
        limit: options.postsLimit ?? 25,
      }),
      supabase
        .from("venue_reviews")
        .select("id, rating, body, created_at, profiles(display_name)")
        .eq("venue_id", venueId)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("venue_announcements")
        .select("id, title, body, published_at")
        .eq("venue_id", venueId)
        .order("published_at", { ascending: false })
        .limit(8),
      supabase
        .from("venue_leaderboard_snapshots")
        .select("category, payload")
        .eq("venue_id", venueId)
        .eq("period_key", "all_time")
        .in("category", ["top_artists", "top_fans"])
        .limit(1)
        .maybeSingle(),
      userId
        ? supabase
            .from("venue_followers")
            .select("id")
            .eq("venue_id", venueId)
            .eq("user_id", userId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      userId
        ? supabase
            .from("venue_reviews")
            .select("id, rating, body")
            .eq("venue_id", venueId)
            .eq("user_id", userId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const reviewRows = (reviews.data ?? []) as unknown as VenueCommunityReview[];
  const reviewCount = reviewRows.length;
  const reviewAvg =
    reviewCount > 0
      ? reviewRows.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : 0;

  return {
    venue: {
      id: venueId,
      slug: base.slug,
      name: base.name,
      region: base.region,
      follower_count: base.follower_count,
    },
    following: Boolean(followingRow.data),
    posts: postsResult.items,
    postsTotal: postsResult.total,
    reviewSummary: { average: reviewAvg, count: reviewCount },
    reviews: reviewRows,
    userReview: userReviewRow.data
      ? {
          id: userReviewRow.data.id as string,
          rating: userReviewRow.data.rating as number,
          body: userReviewRow.data.body as string | null,
        }
      : null,
    announcements: (announcements.data ?? []) as VenueCommunityPageData["announcements"],
    leaderboard: leaderboardRow.data
      ? {
          category: leaderboardRow.data.category as string,
          payload: (leaderboardRow.data.payload as unknown[]) ?? [],
        }
      : null,
  };
}
