import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAgencyRedirect } from "@/lib/auth/agency-account";
import { agencyDashboardPath } from "@/lib/agency/sections";
import { resolveAgencyMembershipForUser } from "@/lib/agency/membership";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { getAgencyPlanLimits } from "@/lib/agency/permissions";
import type {
  AgencyBookingMatch,
  AgencyDashboardStats,
  AgencyManagedArtist,
  AgencyMember,
  AgencyMemberRole,
  AgencyOrgSummary,
  AgencyPublicProfile,
} from "@/lib/agency/types";

async function getClient() {
  if (!isSupabaseConfigured()) return null;
  return createClient();
}

function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function getUserAgencyOrganizations(userId: string): Promise<AgencyOrgSummary[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("agency_organization_members")
    .select("role, agency_organizations(id, slug, name, logo_url, plan, verified)")
    .eq("user_id", userId);

  return (data ?? [])
    .map((row) => {
    const org = row.agency_organizations as
      | { id: string; slug: string; name: string; logo_url: string | null; plan: string; verified: boolean }
      | { id: string; slug: string; name: string; logo_url: string | null; plan: string; verified: boolean }[];
    const o = Array.isArray(org) ? org[0] : org;
    if (!o) return null;
    return {
      id: o.id,
      slug: o.slug,
      name: o.name,
      logo_url: o.logo_url,
      plan: o.plan as AgencyOrgSummary["plan"],
      verified: o.verified,
      role: row.role as AgencyMemberRole,
    };
  })
    .filter(Boolean) as AgencyOrgSummary[];
}

export async function userHasAgencyAccess(userId: string): Promise<boolean> {
  const orgs = await getUserAgencyOrganizations(userId);
  return orgs.length > 0;
}

export async function getAgencyMembership(orgId: string, userId: string) {
  const resolved = await resolveAgencyMembershipForUser(userId, orgId);
  if (!resolved.ok) return null;
  if (resolved.membership.organization_id !== orgId) return null;
  return resolved.membership.role;
}

export type AgencyOrgAccessDeniedCode =
  | "not_configured"
  | "no_membership"
  | "organization_not_found"
  | "permissions_missing"
  | "subscription_missing";

export type AgencyOrgAccessResult =
  | { ok: true; organization: Record<string, unknown>; role: AgencyMemberRole }
  | { ok: false; code: AgencyOrgAccessDeniedCode; message: string };

export async function resolveAgencyOrgAccess(
  orgId: string,
  userId: string
): Promise<AgencyOrgAccessResult> {
  const resolved = await resolveAgencyMembershipForUser(userId, orgId);
  if (!resolved.ok) {
    return {
      ok: false,
      code:
        resolved.code === "no_membership"
          ? "no_membership"
          : resolved.code === "organization_not_found"
            ? "organization_not_found"
            : "not_configured",
      message: resolved.message,
    };
  }

  return {
    ok: true,
    organization: resolved.organization,
    role: resolved.membership.role,
  };
}

export async function getAgencyOrganization(orgId: string, userId: string) {
  const access = await resolveAgencyOrgAccess(orgId, userId);
  if (!access.ok) return null;
  return { organization: access.organization, role: access.role };
}

export async function listAgencyManagedArtists(orgId: string): Promise<AgencyManagedArtist[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("agency_managed_artists")
    .select(
      "*, artists(id, slug, stage_name, banner_url, verified, follower_count, category)"
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  return (data ?? []) as AgencyManagedArtist[];
}

export async function listAgencyMembers(orgId: string): Promise<AgencyMember[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("agency_organization_members")
    .select("id, user_id, role, profiles(display_name, username, avatar_url)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id as string,
    user_id: row.user_id as string,
    role: row.role as AgencyMemberRole,
    profiles: unwrapJoin(row.profiles as AgencyMember["profiles"] | AgencyMember["profiles"][]),
  }));
}

export async function getAgencyDashboardStats(
  supabase: SupabaseClient,
  orgId: string
): Promise<AgencyDashboardStats> {
  const empty: AgencyDashboardStats = {
    totalArtists: 0,
    activeArtists: 0,
    upcomingPerformances: 0,
    ticketsSold: 0,
    grossRevenueCents: 0,
    pendingBookingRequests: 0,
    upcomingSponsorships: 0,
    newFollowers: 0,
    monthlyRevenueCents: 0,
    trendingArtists: [],
    revenueByArtist: [],
    revenueByGenre: [],
    revenueTrend: [],
    ticketsTrend: [],
    attendanceTrend: [],
    geoAudience: [],
  };

  const { data: roster } = await supabase
    .from("agency_managed_artists")
    .select("artist_id, status, artists(slug, stage_name, follower_count, category)")
    .eq("organization_id", orgId);

  const artistIds = (roster ?? []).map((r) => r.artist_id as string);
  if (!artistIds.length) return empty;

  const activeCount = (roster ?? []).filter((r) => r.status === "active").length;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    { count: upcomingCount },
    { count: pendingBookings },
    { data: events },
    { data: tickets },
    { data: orders },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .in("artist_id", artistIds)
      .in("status", ["scheduled", "live"])
      .gte("scheduled_at", new Date().toISOString()),
    supabase
      .from("agency_booking_requests")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .in("status", ["draft", "pending", "matched"]),
    supabase
      .from("events")
      .select("id, artist_id, peak_viewers, scheduled_at, artists(stage_name, slug, category)")
      .in("artist_id", artistIds)
      .order("scheduled_at", { ascending: false })
      .limit(50),
    supabase
      .from("tickets")
      .select("id, event_id, price_cents, created_at, events(artist_id)")
      .gte("created_at", monthStart.toISOString()),
    supabase
      .from("orders")
      .select("total_cents, created_at, metadata")
      .eq("status", "paid")
      .gte("created_at", monthStart.toISOString()),
  ]);

  const ticketRows = tickets ?? [];
  const orderRows = orders ?? [];

  const grossRevenueCents = (orderRows as { total_cents: number }[]).reduce(
    (sum, o) => sum + (o.total_cents ?? 0),
    0
  );

  const trending = (roster ?? [])
    .map((r) => {
      const a = unwrapJoin(
        r.artists as
          | { slug: string; stage_name: string; follower_count: number; category: string }
          | { slug: string; stage_name: string; follower_count: number; category: string }[]
          | null
      );
      return a ? { slug: a.slug, stage_name: a.stage_name, follower_count: a.follower_count } : null;
    })
    .filter(Boolean)
    .sort((a, b) => (b?.follower_count ?? 0) - (a?.follower_count ?? 0))
    .slice(0, 5) as AgencyDashboardStats["trendingArtists"];

  const revenueByArtistMap = new Map<string, number>();
  const revenueByGenreMap = new Map<string, number>();

  for (const row of roster ?? []) {
    const artist = unwrapJoin(
      row.artists as { stage_name: string; category: string } | { stage_name: string; category: string }[] | null
    );
    if (artist) {
      revenueByArtistMap.set(artist.stage_name, 0);
      revenueByGenreMap.set(artist.category, (revenueByGenreMap.get(artist.category) ?? 0));
    }
  }

  return {
    totalArtists: roster?.length ?? 0,
    activeArtists: activeCount,
    upcomingPerformances: upcomingCount ?? 0,
    ticketsSold: Array.isArray(ticketRows) ? ticketRows.length : 0,
    grossRevenueCents,
    pendingBookingRequests: pendingBookings ?? 0,
    upcomingSponsorships: 0,
    newFollowers: trending.reduce((s, a) => s + a.follower_count, 0),
    monthlyRevenueCents: grossRevenueCents,
    trendingArtists: trending,
    revenueByArtist: [...revenueByArtistMap.entries()].map(([name, cents]) => ({ name, cents })),
    revenueByGenre: [...revenueByGenreMap.entries()].map(([genre, cents]) => ({ genre, cents })),
    revenueTrend: [{ month: monthStart.toLocaleString("default", { month: "short" }), cents: grossRevenueCents }],
    ticketsTrend: [{ month: monthStart.toLocaleString("default", { month: "short" }), count: Array.isArray(ticketRows) ? ticketRows.length : 0 }],
    attendanceTrend: (events ?? []).slice(0, 6).map((e) => ({
      month: new Date(e.scheduled_at as string).toLocaleDateString(),
      viewers: (e.peak_viewers as number) ?? 0,
    })),
    geoAudience: [],
  };
}

export async function getAgencyRedirectForUser(userId: string): Promise<string | null> {
  const supabase = await getClient();
  if (!supabase) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, primary_agency_id")
    .eq("id", userId)
    .maybeSingle();

  const fromProfile = profile
    ? resolveAgencyRedirect({
        role: profile.role as string,
        primary_agency_id: profile.primary_agency_id as string | null,
      })
    : null;
  if (fromProfile) return fromProfile;

  const orgs = await getUserAgencyOrganizations(userId);
  if (!orgs.length) return null;
  return agencyDashboardPath();
}

export async function listAgencyBookingMatches(orgId: string, limit = 20): Promise<AgencyBookingMatch[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data: requests } = await supabase
    .from("agency_booking_requests")
    .select("id")
    .eq("organization_id", orgId);

  const requestIds = (requests ?? []).map((r) => r.id as string);
  if (!requestIds.length) return [];

  const { data: matchRows } = await supabase
    .from("agency_booking_matches")
    .select("*, artists(slug, stage_name)")
    .in("booking_request_id", requestIds)
    .order("match_score", { ascending: false })
    .limit(limit);

  return (matchRows ?? []).map((m) => ({
    id: m.id as string,
    artist_id: m.artist_id as string,
    venue_id: m.venue_id as string | null,
    match_score: Number(m.match_score),
    status: m.status as string,
    recommendation: (m.recommendation as AgencyBookingMatch["recommendation"]) ?? {},
    artists: m.artists as AgencyBookingMatch["artists"],
  }));
}

export async function listAgencyBookingRequests(orgId: string, limit = 10) {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("agency_booking_requests")
    .select("id, title, status, artist_ids, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as Array<{
    id: string;
    title: string;
    status: string;
    artist_ids: string[];
    created_at: string;
  }>;
}

export async function listPublicAgencies(limit = 24): Promise<AgencyPublicProfile[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("agency_organizations")
    .select("id, slug, name, logo_url, banner_url, biography, verified, genres, years_in_business, website_url, social_links")
    .eq("verified", true)
    .eq("is_test", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data?.length) return [];

  const profiles: AgencyPublicProfile[] = [];
  for (const org of data) {
    const { count } = await supabase
      .from("agency_managed_artists")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .eq("status", "active");

    profiles.push({
      id: org.id as string,
      slug: org.slug as string,
      name: org.name as string,
      logo_url: org.logo_url as string | null,
      banner_url: org.banner_url as string | null,
      biography: org.biography as string | null,
      verified: org.verified as boolean,
      genres: (org.genres as string[]) ?? [],
      years_in_business: org.years_in_business as number | null,
      roster_count: count ?? 0,
      website_url: org.website_url as string | null,
      social_links: (org.social_links as Record<string, string>) ?? {},
    });
  }

  return profiles;
}

export async function listAdminAgencies(limit = 100) {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("agency_organizations")
    .select("id, slug, name, plan, verified, is_test, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function runAgencyAutoMatch(
  supabase: SupabaseClient,
  orgId: string,
  bookingRequestId: string
): Promise<AgencyBookingMatch[]> {
  const { data: request } = await supabase
    .from("agency_booking_requests")
    .select("*")
    .eq("id", bookingRequestId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!request) return [];

  const artistIds = (request.artist_ids as string[]) ?? [];
  const preferredGenres = (request.preferred_genres as string[]) ?? [];
  const preferredStates = (request.preferred_states as string[]) ?? [];

  const { data: venues } = await supabase
    .from("venues")
    .select("id, slug, name, region, state_code, popularity_score, venue_types(slug, name)")
    .eq("is_active", true)
    .limit(40);

  const { data: artists } = artistIds.length
    ? await supabase
        .from("artists")
        .select("id, slug, stage_name, category, follower_count")
        .in("id", artistIds)
    : await supabase
        .from("agency_managed_artists")
        .select("artist_id, artists(id, slug, stage_name, category, follower_count)")
        .eq("organization_id", orgId)
        .eq("status", "active");

  const artistRows: Array<{ id: string; slug: string; stage_name: string; category: string; follower_count: number }> =
    artistIds.length
      ? ((artists ?? []) as Array<{ id: string; slug: string; stage_name: string; category: string; follower_count: number }>)
      : (artists ?? [])
          .map((r) =>
            unwrapJoin(
              (r as { artists?: { id: string; slug: string; stage_name: string; category: string; follower_count: number } | { id: string; slug: string; stage_name: string; category: string; follower_count: number }[] }).artists ?? null
            )
          )
          .filter(Boolean) as Array<{ id: string; slug: string; stage_name: string; category: string; follower_count: number }>;

  const matches: AgencyBookingMatch[] = [];

  for (const artist of artistRows) {
    const artistId = artist.id;
    const category = artist.category;
    const followers = artist.follower_count ?? 0;

    for (const venue of venues ?? []) {
      const stateCode = venue.state_code as string | null;
      const genreFit = preferredGenres.length
        ? preferredGenres.some((g) => g.toLowerCase() === category?.toLowerCase())
          ? 1
          : 0.3
        : 0.7;
      const stateFit = preferredStates.length
        ? preferredStates.includes(stateCode ?? "")
          ? 1
          : 0.2
        : 0.6;
      const popularity = Math.min(1, ((venue.popularity_score as number) ?? 0) / 100);
      const audienceScore = Math.min(1, followers / 50000);
      const score = Number(((genreFit * 30 + stateFit * 25 + popularity * 25 + audienceScore * 20)).toFixed(2));

      const matchRow = {
        booking_request_id: bookingRequestId,
        artist_id: artistId,
        venue_id: venue.id as string,
        match_score: score,
        status: "recommended",
        recommendation: {
          venueName: venue.name as string,
          venueSlug: venue.slug as string,
          artistName: artist.stage_name,
          artistSlug: artist.slug,
          reasons: [
            genreFit > 0.5 ? "Strong genre fit" : "Moderate genre fit",
            stateFit > 0.5 ? "Matches preferred state" : "Alternative market",
            popularity > 0.5 ? "High-traffic venue" : "Emerging venue opportunity",
          ],
          estimatedRevenueCents: Math.round(followers * 0.05 * 100),
          genreFit: Math.round(genreFit * 100),
          audienceOverlap: Math.round(audienceScore * 100),
        },
      };

      const { data: inserted } = await supabase
        .from("agency_booking_matches")
        .insert(matchRow)
        .select("*, artists(slug, stage_name)")
        .maybeSingle();

      if (inserted) {
        matches.push({
          id: inserted.id as string,
          artist_id: artistId,
          venue_id: venue.id as string,
          match_score: score,
          status: "recommended",
          recommendation: matchRow.recommendation,
          artists: inserted.artists as AgencyBookingMatch["artists"],
        });
      }
    }
  }

  matches.sort((a, b) => b.match_score - a.match_score);

  await supabase
    .from("agency_booking_requests")
    .update({ status: "matched", updated_at: new Date().toISOString() })
    .eq("id", bookingRequestId);

  return matches.slice(0, 20);
}

export async function canAgencyAddArtist(orgId: string, plan: string, currentCount: number) {
  const limits = getAgencyPlanLimits(plan as AgencyOrgSummary["plan"]);
  if (limits.artistLimit == null) return true;
  return currentCount < limits.artistLimit;
}

export async function logAgencyAction(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    actorUserId: string;
    action: string;
    artistId?: string;
    metadata?: Record<string, unknown>;
  }
) {
  await supabase.from("agency_action_audit").insert({
    organization_id: input.organizationId,
    actor_user_id: input.actorUserId,
    artist_id: input.artistId ?? null,
    action: input.action,
    metadata: input.metadata ?? {},
  });
}
