import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config/env";
import type {
  SeasonDetail,
  SeasonLeaderboardRow,
  SeasonProfileFrame,
  SeasonRewardTier,
  SeasonSummary,
  SeasonUserStats,
  SeasonsHubReport,
} from "@/lib/types/seasons";

const POINTS = {
  ticket: 10,
  stamp: 25,
  tip: 5,
  merch: 15,
} as const;

function resolveSeasonStatus(
  row: { status: string; starts_at: string; ends_at: string },
  now = Date.now()
): SeasonSummary["status"] {
  const start = new Date(row.starts_at).getTime();
  const end = new Date(row.ends_at).getTime();
  if (row.status === "archived") return "archived";
  if (now < start) return "scheduled";
  if (now > end) return "archived";
  return row.status === "scheduled" ? "active" : (row.status as SeasonSummary["status"]);
}

function mapSummary(row: Record<string, unknown>): SeasonSummary {
  const theme = firstJoin(row.venue_themes as Record<string, unknown> | Record<string, unknown>[] | null);
  const decorations = (row.decoration_assets as { bannerIcon?: string }) ?? {};
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    tagline: (row.tagline as string) ?? null,
    status: resolveSeasonStatus({
      status: row.status as string,
      starts_at: row.starts_at as string,
      ends_at: row.ends_at as string,
    }),
    startsAt: row.starts_at as string,
    endsAt: row.ends_at as string,
    themeSlug: (theme?.slug as string) ?? null,
    themeName: (theme?.name as string) ?? null,
    decorationIcon: decorations.bannerIcon ?? (theme?.assets as { icon?: string })?.icon ?? null,
  };
}

function firstJoin<T extends Record<string, unknown>>(value: T | T[] | null | undefined) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function computeSeasonMetrics(
  supabase: SupabaseClient,
  userId: string,
  startsAt: string,
  endsAt: string
) {
  const [{ data: tickets }, { data: stamps }, { data: tips }, { data: orders }] = await Promise.all([
    supabase
      .from("tickets")
      .select("id, created_at")
      .eq("user_id", userId)
      .gte("created_at", startsAt)
      .lte("created_at", endsAt),
    supabase
      .from("fan_passport_stamps")
      .select("id, attended_at")
      .eq("user_id", userId)
      .gte("attended_at", startsAt)
      .lte("attended_at", endsAt),
    supabase
      .from("tips")
      .select("id")
      .eq("from_user_id", userId)
      .gte("created_at", startsAt)
      .lte("created_at", endsAt),
    supabase
      .from("orders")
      .select("id, order_type")
      .eq("user_id", userId)
      .eq("status", "paid")
      .gte("created_at", startsAt)
      .lte("created_at", endsAt),
  ]);

  const ticketsCount = tickets?.length ?? 0;
  const stampsCount = stamps?.length ?? 0;
  const tipsCount = tips?.length ?? 0;
  const merchOrdersCount = (orders ?? []).filter((o) => o.order_type === "merch").length;

  const points =
    ticketsCount * POINTS.ticket +
    stampsCount * POINTS.stamp +
    tipsCount * POINTS.tip +
    merchOrdersCount * POINTS.merch;

  return { points, ticketsCount, stampsCount, tipsCount, merchOrdersCount };
}

export async function syncUserSeasonProgress(
  supabase: SupabaseClient,
  userId: string,
  seasonId: string,
  startsAt: string,
  endsAt: string
) {
  const metrics = await computeSeasonMetrics(supabase, userId, startsAt, endsAt);
  await supabase.from("user_season_progress").upsert(
    {
      user_id: userId,
      season_id: seasonId,
      ...metrics,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "user_id,season_id" }
  );
  return metrics;
}

export async function syncSeasonBadgesForUser(
  supabase: SupabaseClient,
  userId: string,
  seasonId: string,
  points: number
) {
  const { data: badges } = await supabase
    .from("season_badges")
    .select("id, points_required")
    .eq("season_id", seasonId);

  const { data: earned } = await supabase
    .from("user_season_badges")
    .select("badge_id")
    .eq("user_id", userId);

  const earnedSet = new Set((earned ?? []).map((e) => e.badge_id as string));
  const toInsert = (badges ?? [])
    .filter((b) => points >= (b.points_required as number) && !earnedSet.has(b.id as string))
    .map((b) => ({ user_id: userId, badge_id: b.id }));

  if (toInsert.length) {
    await supabase.from("user_season_badges").insert(toInsert);
  }
}

export async function refreshSeasonLeaderboard(supabase: SupabaseClient, seasonId: string) {
  const { data: rows } = await supabase
    .from("user_season_progress")
    .select("user_id, points, profiles!inner(display_name, is_test_account)")
    .eq("season_id", seasonId)
    .eq("profiles.is_test_account", false)
    .order("points", { ascending: false })
    .limit(25);

  if (!rows?.length) return [];

  await supabase.from("season_leaderboard_entries").delete().eq("season_id", seasonId);

  const entries = rows.map((row, index) => {
    const profile = firstJoin(row.profiles as Record<string, unknown> | Record<string, unknown>[]);
    return {
      season_id: seasonId,
      user_id: row.user_id as string,
      points: row.points as number,
      rank: index + 1,
      display_name: (profile?.display_name as string) ?? "Fan",
    };
  });

  await supabase.from("season_leaderboard_entries").insert(entries);

  return entries.map((e) => ({
    rank: e.rank,
    userId: e.user_id,
    displayName: e.display_name ?? "Fan",
    points: e.points,
  })) satisfies SeasonLeaderboardRow[];
}

export async function fetchDecoratedVenues(
  supabase: SupabaseClient,
  themeId: string | null
): Promise<SeasonDetail["decoratedVenues"]> {
  if (!themeId) return [];

  const { data: assignments } = await supabase
    .from("venue_theme_assignments")
    .select("venues(slug, name), venue_themes(name, assets)")
    .eq("theme_id", themeId)
    .eq("is_active", true)
    .limit(8);

  return (assignments ?? []).map((row) => {
    const venue = firstJoin(row.venues as Record<string, unknown> | Record<string, unknown>[]);
    const theme = firstJoin(row.venue_themes as Record<string, unknown> | Record<string, unknown>[]);
    const assets = (theme?.assets as { icon?: string }) ?? {};
    return {
      venueSlug: (venue?.slug as string) ?? "",
      venueName: (venue?.name as string) ?? "Venue",
      themeName: (theme?.name as string) ?? "Season theme",
      themeIcon: assets.icon ?? null,
    };
  });
}

export async function listSeasonsHub(supabase: SupabaseClient): Promise<SeasonsHubReport> {
  const { data: rows } = await supabase
    .from("livecircuit_seasons")
    .select(
      "id, slug, name, tagline, status, starts_at, ends_at, decoration_assets, venue_themes(slug, name, assets)"
    )
    .order("sort_order", { ascending: true });

  const summaries = (rows ?? []).map((r) => mapSummary(r as Record<string, unknown>));

  return {
    active: summaries.filter((s) => s.status === "active"),
    upcoming: summaries.filter((s) => s.status === "scheduled"),
    archive: summaries.filter((s) => s.status === "archived"),
    computedAt: new Date().toISOString(),
  };
}

export async function getSeasonRow(supabase: SupabaseClient, slug: string) {
  const { data } = await supabase
    .from("livecircuit_seasons")
    .select(
      `id, slug, name, tagline, description, status, starts_at, ends_at,
      profile_frame, decoration_assets, rewards, stats_snapshot, venue_theme_id,
      venue_themes(slug, name, assets)`
    )
    .eq("slug", slug)
    .maybeSingle();

  return data as Record<string, unknown> | null;
}

export async function buildSeasonDetail(
  supabase: SupabaseClient,
  slug: string,
  userId: string | null
): Promise<SeasonDetail | null> {
  const row = await getSeasonRow(supabase, slug);
  if (!row) return null;

  const summary = mapSummary(row);
  const seasonId = row.id as string;
  const startsAt = row.starts_at as string;
  const endsAt = row.ends_at as string;

  let userStats: SeasonUserStats | null = null;

  if (userId) {
    const metrics = await syncUserSeasonProgress(supabase, userId, seasonId, startsAt, endsAt);
    await syncSeasonBadgesForUser(supabase, userId, seasonId, metrics.points);
    userStats = { ...metrics, rank: null };
  }

  await refreshSeasonLeaderboard(
    isSupabaseConfigured() ? getSupabaseAdmin() : supabase,
    seasonId
  );

  if (userId && userStats) {
    const { data: rankRow } = await supabase
      .from("season_leaderboard_entries")
      .select("rank")
      .eq("season_id", seasonId)
      .eq("user_id", userId)
      .maybeSingle();
    userStats = { ...userStats, rank: (rankRow?.rank as number) ?? null };
  }

  const { data: board } = await supabase
    .from("season_leaderboard_entries")
    .select("rank, user_id, points, display_name")
    .eq("season_id", seasonId)
    .order("rank", { ascending: true })
    .limit(25);

  const { data: badgeRows } = await supabase
    .from("season_badges")
    .select("id, slug, name, description, icon, points_required")
    .eq("season_id", seasonId)
    .order("sort_order", { ascending: true });

  const earnedMap = new Map<string, string>();
  if (userId && badgeRows?.length) {
    const badgeIds = badgeRows.map((b) => b.id as string);
    const { data: earned } = await supabase
      .from("user_season_badges")
      .select("badge_id, earned_at")
      .eq("user_id", userId)
      .in("badge_id", badgeIds);
    for (const e of earned ?? []) earnedMap.set(e.badge_id as string, e.earned_at as string);
  }

  const { data: merchRows } = await supabase
    .from("season_merch_items")
    .select("id, slug, name, description, price_cents, image_url, limited_quantity, is_active")
    .eq("season_id", seasonId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const decoratedVenues = await fetchDecoratedVenues(supabase, row.venue_theme_id as string | null);

  const profileFrame = row.profile_frame as SeasonProfileFrame | null;
  const rewards = (row.rewards as SeasonRewardTier[]) ?? [];
  const archiveStats = (row.stats_snapshot as Record<string, number | string>) ?? {};

  return {
    ...summary,
    description: (row.description as string) ?? null,
    profileFrame: profileFrame?.slug ? profileFrame : null,
    rewards,
    badges: (badgeRows ?? []).map((b) => ({
      id: b.id as string,
      slug: b.slug as string,
      name: b.name as string,
      description: b.description as string,
      icon: (b.icon as string) ?? null,
      pointsRequired: b.points_required as number,
      earned: earnedMap.has(b.id as string),
      earnedAt: earnedMap.get(b.id as string) ?? null,
    })),
    merch: (merchRows ?? []).map((m) => ({
      id: m.id as string,
      slug: m.slug as string,
      name: m.name as string,
      description: (m.description as string) ?? null,
      priceCents: m.price_cents as number,
      imageUrl: (m.image_url as string) ?? null,
      limitedQuantity: m.limited_quantity as number | null,
      soldOut: m.limited_quantity === 0,
    })),
    leaderboard: (board ?? []).map((r) => ({
      rank: r.rank as number,
      userId: r.user_id as string,
      displayName: (r.display_name as string) ?? "Fan",
      points: r.points as number,
      isYou: userId ? r.user_id === userId : false,
    })),
    decoratedVenues,
    archiveStats,
    userStats,
  };
}

export async function equipSeasonProfileFrame(
  supabase: SupabaseClient,
  userId: string,
  seasonSlug: string
) {
  const row = await getSeasonRow(supabase, seasonSlug);
  if (!row) return { ok: false as const, error: "Season not found" };

  const frame = row.profile_frame as SeasonProfileFrame | null;
  if (!frame?.slug) return { ok: false as const, error: "No frame for this season" };

  const { data: progress } = await supabase
    .from("user_season_progress")
    .select("points")
    .eq("user_id", userId)
    .eq("season_id", row.id as string)
    .maybeSingle();

  const goldTier =
    ((row.rewards as SeasonRewardTier[]) ?? []).find((r) => r.tier.toLowerCase().includes("gold"))
      ?.points ?? 100;

  if (((progress?.points as number) ?? 0) < goldTier) {
    return { ok: false as const, error: `Earn ${goldTier} season points to unlock this frame` };
  }

  await supabase.from("profiles").update({ season_profile_frame: frame }).eq("id", userId);

  return { ok: true as const, frame };
}
