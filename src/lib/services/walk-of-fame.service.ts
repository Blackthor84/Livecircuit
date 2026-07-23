import type { SupabaseClient } from "@supabase/supabase-js";
import {
  WALK_OF_FAME_CRITERIA,
  type WalkOfFameCriterion,
  walkOfFameCriterionBlurb,
  walkOfFameCriterionLabel,
} from "@/lib/constants/walk-of-fame";
import {
  communityImpactScore,
  qualifiesForWalkOfFameStar,
  yearsActiveSince,
} from "@/lib/services/walk-of-fame-thresholds";
import type {
  ArtistWalkOfFameReport,
  WalkOfFameArtistEntry,
  WalkOfFameHubReport,
  WalkOfFameStar,
} from "@/lib/types/walk-of-fame";

type ArtistRow = {
  id: string;
  slug: string;
  stage_name: string;
  banner_url: string | null;
  verified: boolean;
  featured: boolean;
  follower_count: number;
  created_at: string;
};

function mapStar(row: Record<string, unknown>): WalkOfFameStar {
  const criterion = row.criterion as WalkOfFameCriterion;
  return {
    criterion,
    criterionLabel: walkOfFameCriterionLabel(criterion),
    blurb: walkOfFameCriterionBlurb(criterion),
    earnedAt: row.earned_at as string,
    metricValue: Number(row.metric_value),
    summary: row.summary as string,
  };
}

function mapArtistEntry(
  artist: ArtistRow,
  stars: WalkOfFameStar[],
  fanVoteCount: number
): WalkOfFameArtistEntry {
  return {
    artistId: artist.id,
    slug: artist.slug,
    stageName: artist.stage_name,
    bannerUrl: artist.banner_url,
    verified: artist.verified,
    starCount: stars.length,
    stars,
    fanVoteCount,
  };
}

async function computeArtistMetrics(supabase: SupabaseClient, artist: ArtistRow) {
  const artistId = artist.id;

  const { data: events } = await supabase
    .from("events")
    .select("id, venue_id")
    .eq("artist_id", artistId);

  const eventIds = (events ?? []).map((e) => e.id as string);
  const venueIds = new Set(
    (events ?? []).map((e) => e.venue_id as string | null).filter(Boolean) as string[]
  );

  const [
    ticketsRes,
    ordersRes,
    tipsRes,
    chatRes,
    reviewsRes,
    votesRes,
    hofRes,
  ] = await Promise.all([
    eventIds.length
      ? supabase.from("tickets").select("id", { count: "exact", head: true }).in("event_id", eventIds)
      : Promise.resolve({ count: 0 }),
    supabase
      .from("orders")
      .select("total_cents")
      .eq("artist_id", artistId)
      .eq("status", "paid"),
    supabase.from("tips").select("id", { count: "exact", head: true }).eq("artist_id", artistId),
    eventIds.length
      ? supabase.from("chat_messages").select("id", { count: "exact", head: true }).in("event_id", eventIds)
      : Promise.resolve({ count: 0 }),
    eventIds.length
      ? supabase.from("reviews").select("id", { count: "exact", head: true }).in("event_id", eventIds)
      : Promise.resolve({ count: 0 }),
    supabase
      .from("artist_walk_of_fame_votes")
      .select("id", { count: "exact", head: true })
      .eq("artist_id", artistId),
    supabase
      .from("venue_hall_of_fame_entries")
      .select("id", { count: "exact", head: true })
      .eq("holder_type", "artist")
      .eq("holder_id", artistId),
  ]);

  const ticketCount = ticketsRes.count ?? 0;
  const revenueCents = (ordersRes.data ?? []).reduce((s, o) => s + (o.total_cents as number), 0);
  const years = yearsActiveSince(artist.created_at);
  const impact = communityImpactScore({
    chatMessages: chatRes.count ?? 0,
    reviews: reviewsRes.count ?? 0,
    tips: tipsRes.count ?? 0,
    followers: artist.follower_count,
  });
  const fanVotes = votesRes.count ?? 0;
  const awardsScore =
    (hofRes.count ?? 0) + (artist.verified ? 1 : 0) + (artist.featured ? 1 : 0);
  const venueCount = venueIds.size;

  return {
    ticketCount,
    revenueCents,
    years,
    impact,
    fanVotes,
    awardsScore,
    venueCount,
  };
}

function summaryFor(criterion: WalkOfFameCriterion, value: number): string {
  switch (criterion) {
    case "attendance":
      return `${Math.round(value).toLocaleString()} tickets sold across LiveCircuit shows`;
    case "revenue":
      return `$${(value / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} in paid orders`;
    case "years_active":
      return `${value.toFixed(1)} years on LiveCircuit`;
    case "community_impact":
      return `Community impact score of ${Math.round(value).toLocaleString()}`;
    case "fan_votes":
      return `${Math.round(value).toLocaleString()} fan votes on the Walk of Fame`;
    case "awards":
      return `${Math.round(value)} honors including Hall of Fame and spotlight recognition`;
    case "venue_contributions":
      return `Performed at ${Math.round(value)} LiveCircuit venues`;
    default:
      return "Permanent Walk of Fame star";
  }
}

export async function syncArtistWalkOfFame(supabase: SupabaseClient, artistId: string) {
  const { data: artist } = await supabase
    .from("artists")
    .select("id, slug, stage_name, banner_url, verified, featured, follower_count, created_at")
    .eq("id", artistId)
    .maybeSingle();

  if (!artist) return;

  const metrics = await computeArtistMetrics(supabase, artist as ArtistRow);

  const pairs: { criterion: WalkOfFameCriterion; value: number }[] = [
    { criterion: "attendance", value: metrics.ticketCount },
    { criterion: "revenue", value: metrics.revenueCents },
    { criterion: "years_active", value: metrics.years },
    { criterion: "community_impact", value: metrics.impact },
    { criterion: "fan_votes", value: metrics.fanVotes },
    { criterion: "awards", value: metrics.awardsScore },
    { criterion: "venue_contributions", value: metrics.venueCount },
  ];

  for (const { criterion, value } of pairs) {
    if (!qualifiesForWalkOfFameStar(criterion, value)) continue;
    await supabase.from("artist_walk_of_fame_stars").upsert(
      {
        artist_id: artistId,
        criterion,
        metric_value: value,
        summary: summaryFor(criterion, value),
        metadata: { synced_at: new Date().toISOString() },
      },
      { onConflict: "artist_id,criterion", ignoreDuplicates: false }
    );
  }
}

export async function syncWalkOfFameBatch(supabase: SupabaseClient, limit = 120) {
  const { data: fromEvents } = await supabase.from("events").select("artist_id").limit(500);
  const ids = [...new Set((fromEvents ?? []).map((r) => r.artist_id as string))].slice(0, limit);

  const { data: featured } = await supabase.from("artists").select("id").eq("featured", true).limit(40);
  for (const row of featured ?? []) {
    const id = row.id as string;
    if (!ids.includes(id)) ids.push(id);
  }

  for (const artistId of ids.slice(0, limit)) {
    await syncArtistWalkOfFame(supabase, artistId);
  }
}

async function loadStarsForArtist(supabase: SupabaseClient, artistId: string) {
  const { data: rows } = await supabase
    .from("artist_walk_of_fame_stars")
    .select("*")
    .eq("artist_id", artistId)
    .order("criterion");

  const byCriterion = new Map((rows ?? []).map((r) => [r.criterion as string, mapStar(r as Record<string, unknown>)]));
  return WALK_OF_FAME_CRITERIA.map((c) => byCriterion.get(c.value)).filter(Boolean) as WalkOfFameStar[];
}

export async function buildWalkOfFameHubReport(
  supabase: SupabaseClient,
  admin: SupabaseClient
): Promise<WalkOfFameHubReport> {
  await syncWalkOfFameBatch(admin);

  const { data: starRows } = await supabase
    .from("artist_walk_of_fame_stars")
    .select("artist_id")
    .limit(2000);

  const artistIds = [...new Set((starRows ?? []).map((r) => r.artist_id as string))];
  if (!artistIds.length) {
    return { artists: [], totalStars: 0, computedAt: new Date().toISOString() };
  }

  const { data: artists } = await supabase
    .from("artists")
    .select("id, slug, stage_name, banner_url, verified, featured, follower_count, created_at")
    .in("id", artistIds);

  const entries: WalkOfFameArtistEntry[] = [];
  for (const artist of artists ?? []) {
    const stars = await loadStarsForArtist(supabase, artist.id as string);
    const { count: fanVoteCount } = await supabase
      .from("artist_walk_of_fame_votes")
      .select("id", { count: "exact", head: true })
      .eq("artist_id", artist.id);

    entries.push(mapArtistEntry(artist as ArtistRow, stars, fanVoteCount ?? 0));
  }

  entries.sort((a, b) => b.starCount - a.starCount || b.fanVoteCount - a.fanVoteCount);

  const totalStars = entries.reduce((s, e) => s + e.starCount, 0);

  return {
    artists: entries,
    totalStars,
    computedAt: new Date().toISOString(),
  };
}

export async function buildArtistWalkOfFameReport(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  artistSlug: string,
  viewerId?: string | null
): Promise<ArtistWalkOfFameReport | null> {
  const { data: artist } = await supabase
    .from("artists")
    .select("id, slug, stage_name, banner_url, verified, featured, follower_count, created_at")
    .eq("slug", artistSlug)
    .maybeSingle();

  if (!artist) return null;

  await syncArtistWalkOfFame(admin, artist.id as string);

  const stars = await loadStarsForArtist(supabase, artist.id as string);
  const { count: fanVoteCount } = await supabase
    .from("artist_walk_of_fame_votes")
    .select("id", { count: "exact", head: true })
    .eq("artist_id", artist.id);

  let viewerHasVoted = false;
  if (viewerId) {
    const { data: vote } = await supabase
      .from("artist_walk_of_fame_votes")
      .select("artist_id")
      .eq("artist_id", artist.id)
      .eq("voter_id", viewerId)
      .maybeSingle();
    viewerHasVoted = Boolean(vote);
  }

  return {
    ...mapArtistEntry(artist as ArtistRow, stars, fanVoteCount ?? 0),
    viewerHasVoted,
    computedAt: new Date().toISOString(),
  };
}

export async function castWalkOfFameVote(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  voterId: string,
  artistId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: artist } = await supabase.from("artists").select("id, user_id").eq("id", artistId).maybeSingle();
  if (!artist) return { ok: false, error: "Artist not found" };
  if (artist.user_id === voterId) return { ok: false, error: "You cannot vote for your own profile" };

  const { error } = await supabase.from("artist_walk_of_fame_votes").insert({
    artist_id: artistId,
    voter_id: voterId,
  });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "You already voted for this artist" };
    return { ok: false, error: error.message };
  }

  await syncArtistWalkOfFame(admin, artistId);
  return { ok: true };
}
