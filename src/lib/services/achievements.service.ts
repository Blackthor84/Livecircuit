import type { SupabaseClient } from "@supabase/supabase-js";
import { applyCoinCredit } from "@/lib/services/coins.service";
import { COIN_REWARDS } from "@/lib/services/coins-rewards";
import {
  ACHIEVEMENT_CATEGORIES,
  achievementCategoryBlurb,
  achievementCategoryLabel,
} from "@/lib/constants/achievements";
import {
  achievementProgressPercent,
  EMPTY_ACHIEVEMENT_METRICS,
  isAchievementEarned,
  metricValue,
} from "@/lib/services/achievements-metrics";
import type {
  AchievementCategoryGroup,
  AchievementEntry,
  AchievementMetrics,
  AchievementsReport,
} from "@/lib/types/achievements";

export async function gatherUserAchievementMetrics(
  supabase: SupabaseClient,
  userId: string
): Promise<AchievementMetrics> {
  const metrics = { ...EMPTY_ACHIEVEMENT_METRICS };

  const [
    ticketsRes,
    friendsRes,
    reviewsRes,
    tipsRes,
    merchRes,
    festivalRes,
    seasonRes,
    marketplaceRes,
    checkInsRes,
    passportAchRes,
    coinRes,
    stampsRes,
  ] = await Promise.all([
    supabase.from("tickets").select("tier, event_id, events(venue_id, artist_id, artists(category))").eq("user_id", userId),
    supabase
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
    supabase.from("reviews").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("tips").select("amount_cents").eq("from_user_id", userId),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("order_type", "merch")
      .eq("status", "paid"),
    supabase
      .from("festival_pass_purchases")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "paid"),
    supabase.from("user_season_progress").select("points").eq("user_id", userId),
    supabase
      .from("marketplace_bookings")
      .select("id", { count: "exact", head: true })
      .or(`artist_user_id.eq.${userId},creator_user_id.eq.${userId}`)
      .eq("status", "completed"),
    supabase.from("venue_check_ins").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("fan_passport_user_achievements").select("achievement_slug").eq("user_id", userId),
    supabase.from("coin_wallets").select("lifetime_earned").eq("user_id", userId).maybeSingle(),
    supabase
      .from("fan_passport_stamps")
      .select("country_name, venue_id, artist_category")
      .eq("user_id", userId),
  ]);

  const tickets = ticketsRes.data ?? [];
  metrics.ticket_count = tickets.length;
  metrics.vip_ticket_count = tickets.filter((t) => {
    const tier = (t.tier as string)?.toLowerCase() ?? "";
    return tier.includes("vip");
  }).length;

  metrics.friend_count = friendsRes.count ?? 0;
  metrics.review_count = reviewsRes.count ?? 0;

  const tips = tipsRes.data ?? [];
  metrics.tip_count = tips.length;
  metrics.tip_total_cents = tips.reduce((s, t) => s + (t.amount_cents as number), 0);

  metrics.merch_order_count = merchRes.count ?? 0;
  metrics.festival_pass_count = festivalRes.count ?? 0;

  const seasonPoints = (seasonRes.data ?? []).map((r) => r.points as number);
  metrics.season_points_max = seasonPoints.length ? Math.max(...seasonPoints) : 0;

  metrics.marketplace_bookings = marketplaceRes.count ?? 0;
  metrics.venue_check_ins = checkInsRes.count ?? 0;
  metrics.passport_achievements = (passportAchRes.data ?? []).length;

  metrics.coin_earned_total = (coinRes.data?.lifetime_earned as number | undefined) ?? 0;

  const venueIds = new Set<string>();
  const countries = new Set<string>();
  const genres = new Set<string>();

  for (const t of tickets) {
    const ev = t.events as unknown as {
      venue_id: string | null;
      artists: { category: string } | { category: string }[] | null;
    } | null;
    if (ev?.venue_id) venueIds.add(ev.venue_id);
    const artist = ev?.artists
      ? Array.isArray(ev.artists)
        ? ev.artists[0]
        : ev.artists
      : null;
    if (artist?.category) genres.add(artist.category);
  }

  for (const stamp of stampsRes.data ?? []) {
    if (stamp.venue_id) venueIds.add(stamp.venue_id as string);
    if (stamp.country_name) countries.add(stamp.country_name as string);
    if (stamp.artist_category) genres.add(stamp.artist_category as string);
  }

  metrics.distinct_venues = venueIds.size;
  metrics.distinct_countries = countries.size;
  metrics.distinct_genres = genres.size;

  return metrics;
}

export async function syncUserAchievementProgress(
  admin: SupabaseClient,
  userId: string,
  metrics: AchievementMetrics
) {
  const { data: defs } = await admin.from("livecircuit_achievement_defs").select("*").order("sort_order");
  if (!defs?.length) return;

  const { data: existing } = await admin
    .from("livecircuit_user_achievement_progress")
    .select("achievement_slug, earned_at")
    .eq("user_id", userId);

  const earnedAtBySlug = new Map((existing ?? []).map((r) => [r.achievement_slug as string, r.earned_at as string | null]));

  const now = new Date().toISOString();
  for (const def of defs) {
    const metric = def.metric as string;
    const target = def.target_value as number;
    const current = metricValue(metric, metrics);
    const earned = isAchievementEarned(metric, target, metrics);
    const prevEarnedAt = earnedAtBySlug.get(def.slug as string) ?? null;
    const earnedAt = earned ? prevEarnedAt ?? now : null;

    await admin.from("livecircuit_user_achievement_progress").upsert(
      {
        user_id: userId,
        achievement_slug: def.slug,
        current_value: current,
        earned_at: earnedAt,
        updated_at: now,
      },
      { onConflict: "user_id,achievement_slug" }
    );

    if (earned && !prevEarnedAt) {
      await applyCoinCredit(
        admin,
        userId,
        COIN_REWARDS.achievement,
        "achievement",
        `lc_achievement:${def.slug as string}`,
        `Achievement unlocked: ${def.name as string}`
      );
    }
  }
}

function mapEntry(def: Record<string, unknown>, metrics: AchievementMetrics, earnedAt: string | null): AchievementEntry {
  const metric = def.metric as string;
  const target = def.target_value as number;
  const current = metricValue(metric, metrics);
  const category = def.category as AchievementEntry["category"];
  return {
    slug: def.slug as string,
    category,
    categoryLabel: achievementCategoryLabel(category),
    categoryBlurb: achievementCategoryBlurb(category),
    name: def.name as string,
    description: def.description as string,
    icon: (def.icon as string | null) ?? null,
    metric,
    targetValue: target,
    tier: def.tier as number,
    sortOrder: def.sort_order as number,
    hidden: def.hidden as boolean,
    currentValue: current,
    earned: earnedAt != null || isAchievementEarned(metric, target, metrics),
    earnedAt,
    progressPercent: achievementProgressPercent(current, target),
  };
}

export async function buildAchievementsReport(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  userId: string
): Promise<AchievementsReport | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return null;

  const metrics = await gatherUserAchievementMetrics(supabase, userId);
  await syncUserAchievementProgress(admin, userId, metrics);

  const [{ data: defs }, { data: progressRows }] = await Promise.all([
    supabase.from("livecircuit_achievement_defs").select("*").eq("hidden", false).order("sort_order"),
    supabase.from("livecircuit_user_achievement_progress").select("*").eq("user_id", userId),
  ]);

  const progressMap = new Map(
    (progressRows ?? []).map((r) => [r.achievement_slug as string, r.earned_at as string | null])
  );

  const entries = (defs ?? []).map((d) =>
    mapEntry(d as Record<string, unknown>, metrics, progressMap.get(d.slug as string) ?? null)
  );

  const byCategory = new Map<string, AchievementEntry[]>();
  for (const e of entries) {
    const list = byCategory.get(e.category) ?? [];
    list.push(e);
    byCategory.set(e.category, list);
  }

  const categories: AchievementCategoryGroup[] = ACHIEVEMENT_CATEGORIES.map((c) => {
    const list = byCategory.get(c.value) ?? [];
    return {
      category: c.value,
      categoryLabel: c.label,
      categoryBlurb: c.blurb,
      earnedCount: list.filter((e) => e.earned).length,
      totalCount: list.length,
      entries: list,
    };
  }).filter((g) => g.totalCount > 0);

  const totalEarned = entries.filter((e) => e.earned).length;

  return {
    userId,
    displayName: (profile.display_name as string | null) ?? null,
    totalEarned,
    totalAvailable: entries.length,
    categories,
    metrics,
    computedAt: new Date().toISOString(),
  };
}
