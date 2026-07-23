import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { CREATOR_SERVICE_CATEGORIES } from "@/lib/constants/creator-marketplace";
import { averageRatingFromRows, slugifyCreatorHandle } from "@/lib/services/marketplace-slug";
import type {
  BookingDetail,
  CreatorListing,
  CreatorProfileDetail,
  MarketplaceBookingSummary,
  MarketplaceHubReport,
} from "@/lib/types/marketplace";

type ProfileRow = { id: string; display_name: string | null; avatar_url: string | null };

async function loadProfiles(supabase: SupabaseClient, ids: string[]) {
  if (!ids.length) return new Map<string, ProfileRow>();
  const { data } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids);
  return new Map((data ?? []).map((p) => [p.id as string, p as ProfileRow]));
}

function mapListing(row: Record<string, unknown>, profile?: ProfileRow): CreatorListing {
  return {
    userId: row.user_id as string,
    slug: row.slug as string,
    displayName: profile?.display_name?.trim() || "Creator",
    avatarUrl: profile?.avatar_url ?? null,
    headline: row.headline as string,
    bio: row.bio as string,
    primaryCategory: row.primary_category as string,
    secondaryCategories: (row.secondary_categories as string[]) ?? [],
    rateCents: row.rate_cents as number,
    currency: row.currency as string,
    averageRating: Number(row.average_rating ?? 0),
    reviewCount: row.review_count as number,
  };
}

export async function refreshCreatorRating(supabase: SupabaseClient, creatorUserId: string) {
  const { data: reviews } = await supabase
    .from("marketplace_reviews")
    .select("rating")
    .eq("creator_user_id", creatorUserId);

  const ratings = (reviews ?? []).map((r) => r.rating as number);
  const average_rating = averageRatingFromRows(ratings);
  await supabase
    .from("creator_profiles")
    .update({
      average_rating,
      review_count: ratings.length,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", creatorUserId);
}

export async function buildMarketplaceHub(supabase: SupabaseClient): Promise<MarketplaceHubReport> {
  const { data: rows } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("is_listed", true)
    .order("average_rating", { ascending: false })
    .limit(60);

  const ids = (rows ?? []).map((r) => r.user_id as string);
  const profiles = await loadProfiles(supabase, ids);
  const listings = (rows ?? []).map((r) => mapListing(r, profiles.get(r.user_id as string)));

  const byCategory: Record<string, CreatorListing[]> = {};
  for (const cat of CREATOR_SERVICE_CATEGORIES) {
    byCategory[cat.value] = listings.filter(
      (l) =>
        l.primaryCategory === cat.value || l.secondaryCategories.includes(cat.value)
    );
  }

  const categories = CREATOR_SERVICE_CATEGORIES.map((cat) => ({
    value: cat.value,
    label: cat.label,
    count: byCategory[cat.value]?.length ?? 0,
  }));

  return {
    featured: listings.slice(0, 12),
    byCategory,
    categories,
    computedAt: new Date().toISOString(),
  };
}

export async function buildCreatorProfileBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<CreatorProfileDetail | null> {
  const { data: row } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!row) return null;

  const profileMap = await loadProfiles(supabase, [row.user_id as string]);
  const listing = mapListing(row, profileMap.get(row.user_id as string));

  const [{ data: portfolio }, { data: reviewRows }] = await Promise.all([
    supabase
      .from("creator_portfolio_items")
      .select("id, title, description, media_url, sort_order")
      .eq("creator_user_id", row.user_id)
      .order("sort_order"),
    supabase
      .from("marketplace_reviews")
      .select("id, rating, body, created_at, reviewer_id")
      .eq("creator_user_id", row.user_id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const reviewerIds = [...new Set((reviewRows ?? []).map((r) => r.reviewer_id as string))];
  const reviewers = await loadProfiles(supabase, reviewerIds);

  return {
    ...listing,
    portfolio: (portfolio ?? []).map((p) => ({
      id: p.id as string,
      title: p.title as string,
      description: p.description as string,
      mediaUrl: (p.media_url as string | null) ?? null,
    })),
    reviews: (reviewRows ?? []).map((r) => ({
      id: r.id as string,
      rating: r.rating as number,
      body: (r.body as string | null) ?? null,
      reviewerName: reviewers.get(r.reviewer_id as string)?.display_name?.trim() || "Artist",
      createdAt: r.created_at as string,
    })),
  };
}

export async function listBookingsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<MarketplaceBookingSummary[]> {
  const { data: rows } = await supabase
    .from("marketplace_bookings")
    .select("*")
    .or(`artist_user_id.eq.${userId},creator_user_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(40);

  if (!rows?.length) return [];

  const otherIds = rows.map((r) =>
    r.artist_user_id === userId ? (r.creator_user_id as string) : (r.artist_user_id as string)
  );
  const profiles = await loadProfiles(supabase, otherIds);

  return rows.map((r) => {
    const asArtist = r.artist_user_id === userId;
    const otherId = asArtist ? (r.creator_user_id as string) : (r.artist_user_id as string);
    return {
      id: r.id as string,
      title: r.title as string,
      serviceCategory: r.service_category as string,
      status: r.status as string,
      agreedPriceCents: (r.agreed_price_cents as number | null) ?? null,
      currency: r.currency as string,
      counterpartyName: profiles.get(otherId)?.display_name?.trim() || (asArtist ? "Creator" : "Artist"),
      role: asArtist ? "artist" : "creator",
      createdAt: r.created_at as string,
      paidAt: (r.paid_at as string | null) ?? null,
    };
  });
}

export async function buildBookingDetail(
  supabase: SupabaseClient,
  bookingId: string,
  userId: string
): Promise<BookingDetail | null> {
  const { data: booking } = await supabase
    .from("marketplace_bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return null;
  const allowed =
    booking.artist_user_id === userId || booking.creator_user_id === userId;
  if (!allowed) return null;

  const profiles = await loadProfiles(supabase, [
    booking.artist_user_id as string,
    booking.creator_user_id as string,
  ]);

  const { data: creator } = await supabase
    .from("creator_profiles")
    .select("slug")
    .eq("user_id", booking.creator_user_id)
    .maybeSingle();

  const { data: messages } = await supabase
    .from("marketplace_booking_messages")
    .select("id, sender_id, body, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });

  const { data: review } = await supabase
    .from("marketplace_reviews")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();

  const status = booking.status as string;
  const isArtist = booking.artist_user_id === userId;

  return {
    id: booking.id as string,
    title: booking.title as string,
    brief: booking.brief as string,
    serviceCategory: booking.service_category as string,
    status,
    agreedPriceCents: (booking.agreed_price_cents as number | null) ?? null,
    currency: booking.currency as string,
    artistUserId: booking.artist_user_id as string,
    creatorUserId: booking.creator_user_id as string,
    artistName: profiles.get(booking.artist_user_id as string)?.display_name?.trim() || "Artist",
    creatorName: profiles.get(booking.creator_user_id as string)?.display_name?.trim() || "Creator",
    creatorSlug: (creator?.slug as string) ?? "",
    canPay: isArtist && status === "awaiting_payment",
    canReview: isArtist && status === "completed" && !review,
    hasReview: Boolean(review),
    messages: (messages ?? []).map((m) => ({
      id: m.id as string,
      senderId: m.sender_id as string,
      body: m.body as string,
      createdAt: m.created_at as string,
    })),
  };
}

export async function upsertCreatorProfileRow(
  supabase: SupabaseClient,
  userId: string,
  input: {
    headline: string;
    bio: string;
    primaryCategory: string;
    secondaryCategories: string[];
    rateCents: number;
    isListed: boolean;
    displayName: string;
  }
) {
  const { data: existing } = await supabase
    .from("creator_profiles")
    .select("slug")
    .eq("user_id", userId)
    .maybeSingle();

  const slug =
    (existing?.slug as string) ?? slugifyCreatorHandle(input.displayName || "creator", userId);

  await supabase.from("creator_profiles").upsert(
    {
      user_id: userId,
      slug,
      headline: input.headline,
      bio: input.bio,
      primary_category: input.primaryCategory,
      secondary_categories: input.secondaryCategories,
      rate_cents: input.rateCents,
      is_listed: input.isListed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return slug;
}

export async function handleMarketplaceCheckoutSession(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session
): Promise<boolean> {
  if (session.metadata?.type !== "marketplace") return false;

  const bookingId = session.metadata.booking_id;
  if (!bookingId) return false;

  const { data: booking } = await supabase
    .from("marketplace_bookings")
    .select("id, status, stripe_checkout_session_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return true;

  if (booking.status === "paid" || booking.status === "completed") return true;

  await supabase
    .from("marketplace_bookings")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_checkout_session_id: session.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  return true;
}
