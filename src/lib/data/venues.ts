import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { unstable_cache } from "next/cache";
import { VENUES_DIRECTORY_TAG, VENUE_TYPES_TAG, venueSlugTag } from "@/lib/cache/venue-tags";
import { getVenueDisplayName } from "@/lib/venues/display-name";
import type { Venue } from "@/types/database";
import type { venueListQuerySchema } from "@/lib/validations/venues";
import type { z } from "zod";

export type VenueTypeRow = {
  id: string;
  slug: string;
  name: string;
  icon_key: string;
  branding: Record<string, unknown>;
};

export type VenueListItem = Venue & {
  venue_types: VenueTypeRow | null;
  live_event_count?: number;
};

export type VenueSponsorshipRow = {
  id: string;
  venue_id: string;
  organization_id: string;
  product: string;
  display_name: string | null;
  is_founding_sponsor: boolean;
  priority_renewal: boolean;
  launch_pricing_cents: number | null;
  contract_starts_at: string;
  contract_ends_at: string | null;
  is_active: boolean;
  history_note: string | null;
  sponsor_organizations: { id: string; slug: string; name: string; logo_url: string | null } | null;
};

export type VenueAdminDetail = {
  venue: VenueListItem;
  sponsorships: VenueSponsorshipRow[];
  featuredArtists: {
    id: string;
    sort_order: number;
    artists: { id: string; slug: string; stage_name: string; banner_url: string | null } | null;
  }[];
  activeTheme: {
    id: string;
    theme_id: string;
    starts_at: string;
    ends_at: string | null;
    venue_themes: { slug: string; name: string } | null;
  } | null;
  themes: { id: string; slug: string; name: string }[];
  venueTypes: VenueTypeRow[];
  sponsorOrganizations: { id: string; slug: string; name: string }[];
  concourseShops: {
    id: string;
    kind: string;
    name: string;
    slug: string;
    is_active: boolean;
    sort_order: number;
  }[];
  billboards: {
    id: string;
    slug: string;
    label: string;
    zone_key: string | null;
    is_active: boolean;
  }[];
  moderationPosts: {
    id: string;
    title: string | null;
    body: string;
    is_pinned: boolean;
    created_at: string;
    profiles: { display_name: string | null } | null;
  }[];
  venueEvents: VenueEventCard[];
};

async function getClient() {
  if (!isSupabaseConfigured()) return null;
  return createClient();
}

export async function getVenueTypes(): Promise<VenueTypeRow[]> {
  if (!isSupabaseConfigured()) return [];
  return cachedVenueTypes();
}

const cachedVenueTypes = unstable_cache(
  async () => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("venue_types")
      .select("id, slug, name, icon_key, branding")
      .order("sort_order", { ascending: true });
    return (data ?? []) as VenueTypeRow[];
  },
  ["venue-types"],
  { tags: [VENUE_TYPES_TAG], revalidate: 300 }
);

export async function listVenuesForAdmin(): Promise<VenueListItem[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("venues")
    .select("*, venue_types(id, slug, name, icon_key, branding)")
    .order("popularity_score", { ascending: false });

  if (error) return [];
  return (data ?? []) as VenueListItem[];
}

export async function getVenueAdminDetail(venueId: string): Promise<VenueAdminDetail | null> {
  const supabase = await getClient();
  if (!supabase) return null;

  const { data: venue } = await supabase
    .from("venues")
    .select("*, venue_types(id, slug, name, icon_key, branding)")
    .eq("id", venueId)
    .maybeSingle();

  if (!venue) return null;

  const venueSlug = venue.slug as string;

  const [
    sponsorships,
    featuredArtists,
    themeAssignments,
    themes,
    venueTypes,
    sponsorOrganizations,
    concourseShops,
    billboards,
    moderationPosts,
  ] = await Promise.all([
    supabase
      .from("venue_sponsorships")
      .select(
        "*, sponsor_organizations(id, slug, name, logo_url)"
      )
      .eq("venue_id", venueId)
      .order("created_at", { ascending: false }),
    supabase
      .from("venue_featured_artists")
      .select("id, sort_order, artists(id, slug, stage_name, banner_url)")
      .eq("venue_id", venueId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("venue_theme_assignments")
      .select("id, theme_id, starts_at, ends_at, venue_themes(slug, name)")
      .eq("venue_id", venueId)
      .eq("is_active", true)
      .limit(1),
    supabase.from("venue_themes").select("id, slug, name").order("sort_order"),
    supabase
      .from("venue_types")
      .select("id, slug, name, icon_key, branding")
      .order("sort_order"),
    supabase.from("sponsor_organizations").select("id, slug, name").order("name"),
    supabase
      .from("concourse_shops")
      .select("id, kind, name, slug, is_active, sort_order")
      .eq("venue_id", venueId)
      .order("sort_order"),
    supabase
      .from("venue_billboards")
      .select("id, slug, label, zone_key, is_active")
      .eq("venue_id", venueId)
      .order("slug"),
    supabase
      .from("venue_posts")
      .select("id, title, body, is_pinned, created_at, profiles(display_name)")
      .eq("venue_id", venueId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const activeTheme = themeAssignments.data?.[0] ?? null;

  const venueEventsResult = await listVenueEvents(venueSlug, {
    status: "all",
    page: 1,
    limit: 30,
  });

  return {
    venue: venue as VenueListItem,
    sponsorships: (sponsorships.data ?? []) as VenueSponsorshipRow[],
    featuredArtists: (featuredArtists.data ?? []) as unknown as VenueAdminDetail["featuredArtists"],
    activeTheme: activeTheme as unknown as VenueAdminDetail["activeTheme"],
    themes: (themes.data ?? []) as VenueAdminDetail["themes"],
    venueTypes: (venueTypes.data ?? []) as VenueTypeRow[],
    sponsorOrganizations: (sponsorOrganizations.data ?? []) as VenueAdminDetail["sponsorOrganizations"],
    concourseShops: (concourseShops.data ?? []) as VenueAdminDetail["concourseShops"],
    billboards: (billboards.data ?? []) as VenueAdminDetail["billboards"],
    moderationPosts: (moderationPosts.data ?? []) as unknown as VenueAdminDetail["moderationPosts"],
    venueEvents: venueEventsResult?.items ?? [],
  };
}

export type VenuePublicDetail = VenueListItem & {
  founding_sponsor: VenueSponsorshipRow | null;
  live_events: VenueEventCard[];
  upcoming_events: VenueEventCard[];
};

export type VenueEventCard = {
  id: string;
  slug: string;
  title: string;
  status?: string;
  scheduled_at: string;
  viewer_count?: number;
  venue_room_label?: string | null;
  artists: { slug: string; stage_name: string; banner_url: string | null } | null;
};

export type VenueLandingPageData = VenuePublicDetail & {
  featured_sponsor: { id: string; slug: string; name: string; logo_url: string | null } | null;
  featured_artists: {
    sort_order: number;
    artists: {
      id: string;
      slug: string;
      stage_name: string;
      banner_url: string | null;
      category: string;
      verified: boolean;
      follower_count: number;
    } | null;
  }[];
  review_summary: { average: number; count: number };
  recent_reviews: {
    id: string;
    rating: number;
    body: string | null;
    created_at: string;
    profiles: { display_name: string | null } | null;
  }[];
  past_events: VenueEventCard[];
  nearby_venues: VenueListItem[];
  active_theme: { slug: string; name: string; assets: Record<string, unknown> } | null;
  leaderboard: { category: string; payload: unknown[] } | null;
  sponsor_banner: {
    advertisement_id: string;
    billboard_id: string;
    asset_url: string | null;
    click_url: string | null;
    name: string;
    organization_name: string | null;
  } | null;
  community_posts: {
    id: string;
    title: string | null;
    body: string;
    is_pinned: boolean;
    created_at: string;
    profiles: { display_name: string | null } | null;
  }[];
};

const eventSelect =
  "id, slug, title, status, scheduled_at, viewer_count, venue_room_label, artists(slug, stage_name, banner_url)";

export async function isFollowingVenue(userId: string, venueId: string): Promise<boolean> {
  const supabase = await getClient();
  if (!supabase) return false;
  const { data } = await supabase
    .from("venue_followers")
    .select("id")
    .eq("venue_id", venueId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function getVenueLandingPage(slug: string): Promise<VenueLandingPageData | null> {
  const base = await getVenueBySlug(slug);
  if (!base) return null;

  const supabase = await getClient();
  if (!supabase) return null;

  const venueId = base.id;

  const [
    featuredSponsor,
    featuredArtists,
    reviews,
    pastEvents,
    nearby,
    themeAssignment,
    leaderboardRow,
    billboard,
    communityPosts,
  ] = await Promise.all([
    base.featured_sponsor_org_id
      ? supabase
          .from("sponsor_organizations")
          .select("id, slug, name, logo_url")
          .eq("id", base.featured_sponsor_org_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("venue_featured_artists")
      .select(
        "sort_order, artists(id, slug, stage_name, banner_url, category, verified, follower_count)"
      )
      .eq("venue_id", venueId)
      .order("sort_order", { ascending: true })
      .limit(12),
    supabase
      .from("venue_reviews")
      .select("id, rating, body, created_at, profiles(display_name)")
      .eq("venue_id", venueId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("events")
      .select(eventSelect)
      .eq("venue_id", venueId)
      .eq("status", "ended")
      .order("scheduled_at", { ascending: false })
      .limit(8),
    supabase
      .from("venues")
      .select("*, venue_types(id, slug, name, icon_key, branding)")
      .eq("is_active", true)
      .neq("id", venueId)
      .eq("region", base.region)
      .order("popularity_score", { ascending: false })
      .limit(4),
    supabase
      .from("venue_theme_assignments")
      .select("venue_themes(slug, name, assets)")
      .eq("venue_id", venueId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("venue_leaderboard_snapshots")
      .select("category, payload")
      .eq("venue_id", venueId)
      .eq("period_key", "all_time")
      .in("category", ["top_artists", "top_fans"])
      .limit(1)
      .maybeSingle(),
    supabase
      .from("venue_billboards")
      .select("id")
      .eq("venue_id", venueId)
      .eq("slug", "homepage-hero")
      .maybeSingle(),
    supabase
      .from("venue_posts")
      .select("id, title, body, is_pinned, created_at, profiles(display_name)")
      .eq("venue_id", venueId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  let sponsorBanner: VenueLandingPageData["sponsor_banner"] = null;
  if (billboard.data?.id) {
    const { data: schedule } = await supabase
      .from("advertisement_schedules")
      .select(
        "advertisements(id, name, asset_url, click_url, sponsor_campaigns(sponsor_organizations(name)))"
      )
      .eq("billboard_id", billboard.data.id as string)
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (schedule?.advertisements) {
      const ad = schedule.advertisements as unknown as {
        id: string;
        name: string;
        asset_url: string | null;
        click_url: string | null;
        sponsor_campaigns: { sponsor_organizations: { name: string } | null } | null;
      };
      const campaigns = ad.sponsor_campaigns as { sponsor_organizations: { name: string } | null } | null;
      const org = Array.isArray(campaigns)
        ? campaigns[0]?.sponsor_organizations
        : campaigns?.sponsor_organizations;
      const orgName = Array.isArray(org) ? org[0]?.name : org?.name;
      sponsorBanner = {
        advertisement_id: ad.id,
        billboard_id: billboard.data.id as string,
        name: ad.name,
        asset_url: ad.asset_url,
        click_url: ad.click_url,
        organization_name: orgName ?? null,
      };
    }
  }

  const reviewRows = reviews.data ?? [];
  const reviewCount = reviewRows.length;
  const reviewAvg =
    reviewCount > 0
      ? reviewRows.reduce((sum, r) => sum + (r.rating as number), 0) / reviewCount
      : 0;

  const themeRaw = themeAssignment.data?.venue_themes as
    | { slug: string; name: string; assets: Record<string, unknown> }
    | { slug: string; name: string; assets: Record<string, unknown> }[]
    | null;
  const activeTheme = Array.isArray(themeRaw) ? themeRaw[0] : themeRaw;

  const liveWithArtists = await enrichVenueEvents(supabase, base.live_events);
  const upcomingWithArtists = await enrichVenueEvents(supabase, base.upcoming_events);

  return {
    ...base,
    live_events: liveWithArtists,
    upcoming_events: upcomingWithArtists,
    featured_sponsor: featuredSponsor.data as VenueLandingPageData["featured_sponsor"],
    featured_artists: (featuredArtists.data ?? []) as unknown as VenueLandingPageData["featured_artists"],
    review_summary: { average: reviewAvg, count: reviewCount },
    recent_reviews: reviewRows as unknown as VenueLandingPageData["recent_reviews"],
    past_events: normalizeEventRows(pastEvents.data),
    nearby_venues: (nearby.data ?? []) as VenueListItem[],
    active_theme: activeTheme ?? null,
    leaderboard: leaderboardRow.data
      ? {
          category: leaderboardRow.data.category as string,
          payload: (leaderboardRow.data.payload as unknown[]) ?? [],
        }
      : null,
    sponsor_banner: sponsorBanner,
    community_posts: (communityPosts.data ?? []) as unknown as VenueLandingPageData["community_posts"],
  };
}

async function enrichVenueEvents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  events: VenuePublicDetail["live_events"]
): Promise<VenueEventCard[]> {
  if (!events.length) return [];
  const ids = events.map((e) => e.id);
  const { data } = await supabase.from("events").select(eventSelect).in("id", ids);
  return normalizeEventRows(data);
}

function normalizeEventRows(rows: unknown): VenueEventCard[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    const artists = r.artists as VenueEventCard["artists"];
    const artistSingle = Array.isArray(artists) ? artists[0] : artists;
    return {
      id: r.id as string,
      slug: r.slug as string,
      title: r.title as string,
      status: r.status as string | undefined,
      scheduled_at: r.scheduled_at as string,
      viewer_count: r.viewer_count as number | undefined,
      venue_room_label: r.venue_room_label as string | null | undefined,
      artists: artistSingle ?? null,
    };
  });
}

export async function getVenueBySlug(slug: string): Promise<VenuePublicDetail | null> {
  if (!isSupabaseConfigured()) return null;
  return cachedVenueBySlug(slug);
}

async function fetchVenueBySlug(slug: string): Promise<VenuePublicDetail | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: venue } = await supabase
    .from("venues")
    .select("*, venue_types(id, slug, name, icon_key, branding)")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!venue) return null;

  const venueId = venue.id as string;

  const [sponsorships, liveEvents, upcomingEvents] = await Promise.all([
    supabase
      .from("venue_sponsorships")
      .select("*, sponsor_organizations(id, slug, name, logo_url)")
      .eq("venue_id", venueId)
      .eq("is_active", true),
    supabase
      .from("events")
      .select("id, slug, title, status, scheduled_at, viewer_count")
      .eq("venue_id", venueId)
      .eq("status", "live")
      .order("scheduled_at", { ascending: true })
      .limit(50),
    supabase
      .from("events")
      .select("id, slug, title, scheduled_at")
      .eq("venue_id", venueId)
      .in("status", ["scheduled"])
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(20),
  ]);

  const founding =
    (sponsorships.data ?? []).find(
      (s) =>
        (s as { is_founding_sponsor: boolean }).is_founding_sponsor &&
        (s as { is_active: boolean }).is_active
    ) ?? null;

  return {
    ...(venue as VenueListItem),
    founding_sponsor: founding as VenueSponsorshipRow | null,
    live_events: (liveEvents.data ?? []) as VenuePublicDetail["live_events"],
    upcoming_events: (upcomingEvents.data ?? []) as VenuePublicDetail["upcoming_events"],
  };
}

function cachedVenueBySlug(slug: string) {
  return unstable_cache(
    async () => fetchVenueBySlug(slug),
    ["venue-by-slug", slug],
    { tags: [venueSlugTag(slug), VENUES_DIRECTORY_TAG], revalidate: 60 }
  )();
}

export async function getVenuePickerList(): Promise<
  { id: string; slug: string; name: string; region: string; state_code: string | null }[]
> {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("venues")
    .select("id, slug, name, region, state_code")
    .eq("is_active", true)
    .order("name", { ascending: true });

  return (data ?? []) as { id: string; slug: string; name: string; region: string; state_code: string | null }[];
}

export type VenueEventsListResult = {
  items: VenueEventCard[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  liveCount: number;
};

export async function listVenueEvents(
  venueSlug: string,
  query: { status?: "live" | "scheduled" | "ended" | "all"; page: number; limit: number }
): Promise<VenueEventsListResult | null> {
  const supabase = await getClient();
  if (!supabase) return null;

  const { data: venue } = await supabase
    .from("venues")
    .select("id")
    .eq("slug", venueSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!venue) return null;

  const venueId = venue.id as string;
  const from = (query.page - 1) * query.limit;
  const to = from + query.limit - 1;

  const { count: liveCount } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", venueId)
    .eq("status", "live");

  let builder = supabase
    .from("events")
    .select(eventSelect, { count: "exact" })
    .eq("venue_id", venueId);

  const status = query.status ?? "all";
  if (status === "live") builder = builder.eq("status", "live");
  else if (status === "scheduled") {
    builder = builder.eq("status", "scheduled").gte("scheduled_at", new Date().toISOString());
  } else if (status === "ended") builder = builder.eq("status", "ended");
  else builder = builder.in("status", ["live", "scheduled", "ended"]);

  if (status === "live") builder = builder.order("viewer_count", { ascending: false });
  else builder = builder.order("scheduled_at", { ascending: status !== "ended" });

  const { data, count, error } = await builder.range(from, to);
  if (error) {
    return {
      items: [],
      page: query.page,
      limit: query.limit,
      total: 0,
      hasMore: false,
      liveCount: liveCount ?? 0,
    };
  }

  const total = count ?? 0;
  return {
    items: normalizeEventRows(data),
    page: query.page,
    limit: query.limit,
    total,
    hasMore: from + (data?.length ?? 0) < total,
    liveCount: liveCount ?? 0,
  };
}

export type VenueListResult = {
  items: VenueListItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export async function listVenuesPublic(
  query: z.infer<typeof venueListQuerySchema>
): Promise<VenueListResult> {
  const empty: VenueListResult = {
    items: [],
    page: query.page,
    limit: query.limit,
    total: 0,
    hasMore: false,
  };

  if (!isSupabaseConfigured()) return empty;

  const supabase = await createClient();
  const from = (query.page - 1) * query.limit;
  const to = from + query.limit - 1;

  let venueIdsLive: string[] | null = null;
  if (query.liveNow === "true") {
    const { data: liveRows } = await supabase
      .from("events")
      .select("venue_id")
      .eq("status", "live")
      .not("venue_id", "is", null);
    venueIdsLive = [
      ...new Set(
        (liveRows ?? [])
          .map((r) => r.venue_id as string)
          .filter(Boolean)
      ),
    ];
    if (!venueIdsLive.length) return empty;
  }

  let typeId: string | null = null;
  if (query.venueType) {
    const { data: vt } = await supabase
      .from("venue_types")
      .select("id")
      .eq("slug", query.venueType)
      .maybeSingle();
    typeId = (vt?.id as string) ?? null;
    if (!typeId) return empty;
  }

  let builder = supabase
    .from("venues")
    .select("*, venue_types(id, slug, name, icon_key, branding)", { count: "exact" })
    .eq("is_active", true);

  if (query.countryId) builder = builder.eq("country_id", query.countryId);
  if (query.stateCode) builder = builder.eq("state_code", query.stateCode);
  if (query.region) builder = builder.ilike("region", `%${query.region}%`);
  if (typeId) builder = builder.eq("venue_type_id", typeId);
  if (venueIdsLive) builder = builder.in("id", venueIdsLive);

  const sort = query.sort ?? "popularity";
  if (sort === "name") builder = builder.order("display_name", { ascending: true });
  else if (sort === "visitors") builder = builder.order("current_visitors", { ascending: false });
  else builder = builder.order("popularity_score", { ascending: false });

  const { data, count, error } = await builder.range(from, to);

  if (error) return empty;

  const total = count ?? 0;
  return {
    items: (data ?? []) as VenueListItem[],
    page: query.page,
    limit: query.limit,
    total,
    hasMore: from + (data?.length ?? 0) < total,
  };
}

export async function getFeaturedVenuesForHome(limit = 6): Promise<VenueListItem[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("venues")
    .select("*, venue_types(id, slug, name, icon_key, branding)")
    .eq("is_active", true)
    .order("popularity_score", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as VenueListItem[];
}

/** Resolve public title from any venue row shape (legacy or naming-rights). */
export function resolveVenuePublicName(venue: VenueListItem): string {
  return getVenueDisplayName(venue);
}
