import type { SupabaseClient } from "@supabase/supabase-js";
import {
  GAMIFICATION_TITLES,
  titleForLevelPrestige,
  unlockedTitles,
} from "@/lib/constants/gamification";
import { applyCoinCredit } from "@/lib/services/coins.service";
import { utcDateKey } from "@/lib/services/coins-rewards";
import {
  levelFromTotalXp,
  periodKeyForCadence,
  periodStartIso,
  prestigeFromLevel,
  xpProgressInLevel,
} from "@/lib/services/gamification-levels";
import type {
  GamificationLeaderboardRow,
  GamificationMetrics,
  GamificationReport,
  QuestEntry,
} from "@/lib/types/gamification";

const EMPTY_METRICS: GamificationMetrics = {
  daily_login: 0,
  reviews_today: 0,
  checkins_today: 0,
  tips_today: 0,
  friend_messages_today: 0,
  tickets_week: 0,
  reviews_week: 0,
  tips_week: 0,
  friends_week: 0,
  xp_week: 0,
  tickets_month: 0,
  venues_month: 0,
  festivals_month: 0,
  achievements_month: 0,
  xp_month: 0,
};

function metricValue(metric: string, metrics: GamificationMetrics): number {
  if (metric in metrics) return metrics[metric as keyof GamificationMetrics] ?? 0;
  return 0;
}

function questProgressPercent(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

export async function gatherGamificationMetrics(
  supabase: SupabaseClient,
  userId: string
): Promise<GamificationMetrics> {
  const metrics = { ...EMPTY_METRICS };
  const dayStart = periodStartIso("daily");
  const weekStart = periodStartIso("weekly");
  const monthStart = periodStartIso("monthly");
  const today = utcDateKey();

  const [
    dailyClaim,
    reviewsToday,
    checkinsToday,
    tipsToday,
    messagesToday,
    ticketsWeek,
    reviewsWeek,
    tipsWeek,
    friendsWeek,
    xpWeek,
    ticketsMonth,
    checkinsMonth,
    ticketsMonthVenues,
    festivalsMonth,
    achievementsMonth,
    xpMonth,
  ] = await Promise.all([
    supabase.from("coin_daily_claims").select("claim_date").eq("user_id", userId).eq("claim_date", today).maybeSingle(),
    supabase.from("reviews").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", dayStart),
    supabase.from("venue_check_ins").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", dayStart),
    supabase.from("tips").select("id", { count: "exact", head: true }).eq("from_user_id", userId).gte("created_at", dayStart),
    supabase.from("friend_messages").select("id", { count: "exact", head: true }).eq("sender_id", userId).gte("created_at", dayStart),
    supabase.from("tickets").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", weekStart),
    supabase.from("reviews").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", weekStart),
    supabase.from("tips").select("id", { count: "exact", head: true }).eq("from_user_id", userId).gte("created_at", weekStart),
    supabase
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .gte("updated_at", weekStart),
    supabase
      .from("livecircuit_xp_events")
      .select("amount")
      .eq("user_id", userId)
      .gte("created_at", weekStart),
    supabase.from("tickets").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", monthStart),
    supabase.from("venue_check_ins").select("venue_id").eq("user_id", userId).gte("created_at", monthStart),
    supabase.from("tickets").select("event_id, events(venue_id)").eq("user_id", userId).gte("created_at", monthStart),
    supabase
      .from("festival_pass_purchases")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "paid")
      .gte("created_at", monthStart),
    supabase
      .from("livecircuit_user_achievement_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("earned_at", "is", null)
      .gte("earned_at", monthStart),
    supabase
      .from("livecircuit_xp_events")
      .select("amount")
      .eq("user_id", userId)
      .gte("created_at", monthStart),
  ]);

  metrics.daily_login = dailyClaim.data ? 1 : 0;
  metrics.reviews_today = reviewsToday.count ?? 0;
  metrics.checkins_today = checkinsToday.count ?? 0;
  metrics.tips_today = tipsToday.count ?? 0;
  metrics.friend_messages_today = messagesToday.count ?? 0;
  metrics.tickets_week = ticketsWeek.count ?? 0;
  metrics.reviews_week = reviewsWeek.count ?? 0;
  metrics.tips_week = tipsWeek.count ?? 0;
  metrics.friends_week = friendsWeek.count ?? 0;
  metrics.xp_week = (xpWeek.data ?? []).reduce((s, r) => s + (r.amount as number), 0);
  metrics.tickets_month = ticketsMonth.count ?? 0;

  const venueSet = new Set<string>();
  for (const row of checkinsMonth.data ?? []) {
    if (row.venue_id) venueSet.add(row.venue_id as string);
  }
  for (const row of ticketsMonthVenues.data ?? []) {
    const ev = row.events as { venue_id: string | null } | { venue_id: string | null }[] | null;
    const event = Array.isArray(ev) ? ev[0] : ev;
    if (event?.venue_id) venueSet.add(event.venue_id);
  }
  metrics.venues_month = venueSet.size;
  metrics.festivals_month = festivalsMonth.count ?? 0;
  metrics.achievements_month = achievementsMonth.count ?? 0;
  metrics.xp_month = (xpMonth.data ?? []).reduce((s, r) => s + (r.amount as number), 0);

  return metrics;
}

async function grantQuestRewards(
  admin: SupabaseClient,
  userId: string,
  questSlug: string,
  periodKey: string,
  xpReward: number,
  coinReward: number,
  questName: string
) {
  const sourceKey = `quest:${questSlug}:${periodKey}`;
  const { error } = await admin.from("livecircuit_xp_events").insert({
    user_id: userId,
    amount: xpReward,
    source_key: sourceKey,
    source_type: "quest",
    description: `Quest complete: ${questName}`,
  });
  if (error?.code === "23505") return false;

  if (coinReward > 0) {
    await applyCoinCredit(admin, userId, coinReward, "quest", sourceKey, `Quest reward: ${questName}`);
  }
  return true;
}

async function refreshGamificationProfile(admin: SupabaseClient, userId: string) {
  const { data: xpRows } = await admin.from("livecircuit_xp_events").select("amount").eq("user_id", userId);
  const totalXp = (xpRows ?? []).reduce((s, r) => s + (r.amount as number), 0);
  const level = levelFromTotalXp(totalXp);
  const prestige = prestigeFromLevel(level);

  await admin.from("livecircuit_fan_gamification").upsert(
    {
      user_id: userId,
      xp: totalXp,
      level,
      prestige,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return { totalXp, level, prestige };
}

export async function syncGamificationQuests(
  admin: SupabaseClient,
  userId: string,
  metrics: GamificationMetrics
) {
  const { data: defs } = await admin.from("livecircuit_quest_defs").select("*").order("sort_order");
  if (!defs?.length) return;

  const now = new Date().toISOString();

  for (const def of defs) {
    const cadence = def.cadence as string;
    const periodKey = periodKeyForCadence(cadence);
    const metric = def.metric as string;
    const target = def.target_value as number;
    const current = metricValue(metric, metrics);
    const completed = current >= target;

    const { data: existing } = await admin
      .from("livecircuit_user_quest_progress")
      .select("completed_at")
      .eq("user_id", userId)
      .eq("quest_slug", def.slug)
      .eq("period_key", periodKey)
      .maybeSingle();

    const wasComplete = Boolean(existing?.completed_at);
    const completedAt = completed ? existing?.completed_at ?? now : null;

    await admin.from("livecircuit_user_quest_progress").upsert(
      {
        user_id: userId,
        quest_slug: def.slug,
        period_key: periodKey,
        current_value: current,
        completed_at: completedAt,
        updated_at: now,
      },
      { onConflict: "user_id,quest_slug,period_key" }
    );

    if (completed && !wasComplete) {
      await grantQuestRewards(
        admin,
        userId,
        def.slug as string,
        periodKey,
        def.xp_reward as number,
        def.coin_reward as number,
        def.name as string
      );
    }
  }

  await refreshGamificationProfile(admin, userId);
}

function mapQuest(
  def: Record<string, unknown>,
  metrics: GamificationMetrics,
  completedAt: string | null
): QuestEntry {
  const metric = def.metric as string;
  const target = def.target_value as number;
  const current = metricValue(metric, metrics);
  const cadence = def.cadence as QuestEntry["cadence"];
  return {
    slug: def.slug as string,
    cadence,
    name: def.name as string,
    description: def.description as string,
    icon: (def.icon as string | null) ?? null,
    metric,
    targetValue: target,
    xpReward: def.xp_reward as number,
    coinReward: def.coin_reward as number,
    periodKey: periodKeyForCadence(cadence),
    currentValue: current,
    completed: completedAt != null || current >= target,
    completedAt,
    progressPercent: questProgressPercent(current, target),
  };
}

export async function buildGamificationReport(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  userId: string
): Promise<GamificationReport | null> {
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle();
  if (!profile) return null;

  const metrics = await gatherGamificationMetrics(supabase, userId);
  await syncGamificationQuests(admin, userId, metrics);

  const [{ data: defs }, { data: progressRows }, { data: fanRow }, { data: boardRows }] = await Promise.all([
    supabase.from("livecircuit_quest_defs").select("*").order("sort_order"),
    supabase.from("livecircuit_user_quest_progress").select("*").eq("user_id", userId),
    supabase.from("livecircuit_fan_gamification").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("livecircuit_fan_gamification")
      .select("user_id, xp, level, prestige, profiles(display_name)")
      .order("xp", { ascending: false })
      .limit(10),
  ]);

  const progressMap = new Map(
    (progressRows ?? []).map((r) => [`${r.quest_slug}:${r.period_key}`, r.completed_at as string | null])
  );

  const quests = (defs ?? []).map((d) => {
    const cadence = d.cadence as string;
    const pk = periodKeyForCadence(cadence);
    const completedAt = progressMap.get(`${d.slug}:${pk}`) ?? null;
    return mapQuest(d as Record<string, unknown>, metrics, completedAt);
  });

  const xp = (fanRow?.xp as number) ?? 0;
  const level = (fanRow?.level as number) ?? 1;
  const prestige = (fanRow?.prestige as number) ?? 0;
  const equippedSlug = (fanRow?.equipped_title_slug as string | null) ?? null;
  const defaultTitle = titleForLevelPrestige(level, prestige);
  const equippedTitle =
    GAMIFICATION_TITLES.find((t) => t.slug === equippedSlug) ??
    defaultTitle;

  const leaderboard: GamificationLeaderboardRow[] = (boardRows ?? []).map((row, i) => {
    const prof = row.profiles as { display_name: string | null } | { display_name: string | null }[] | null;
    const name = Array.isArray(prof) ? prof[0]?.display_name : prof?.display_name;
    const lvl = row.level as number;
    const prest = row.prestige as number;
    return {
      rank: i + 1,
      userId: row.user_id as string,
      displayName: name?.trim() || "Fan",
      xp: row.xp as number,
      level: lvl,
      titleLabel: titleForLevelPrestige(lvl, prest).label,
    };
  });

  return {
    userId,
    displayName: (profile.display_name as string | null) ?? null,
    xp,
    level,
    prestige,
    equippedTitleSlug: equippedTitle.slug,
    equippedTitleLabel: equippedTitle.label,
    levelProgress: xpProgressInLevel(xp, level),
    daily: quests.filter((q) => q.cadence === "daily"),
    weekly: quests.filter((q) => q.cadence === "weekly"),
    monthly: quests.filter((q) => q.cadence === "monthly"),
    unlockedTitles: unlockedTitles(level, prestige).map((t) => ({ slug: t.slug, label: t.label })),
    leaderboard,
    computedAt: new Date().toISOString(),
  };
}

export async function equipGamificationTitle(
  admin: SupabaseClient,
  userId: string,
  titleSlug: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: row } = await admin
    .from("livecircuit_fan_gamification")
    .select("level, prestige")
    .eq("user_id", userId)
    .maybeSingle();

  const level = (row?.level as number) ?? 1;
  const prestige = (row?.prestige as number) ?? 0;
  const allowed = unlockedTitles(level, prestige).some((t) => t.slug === titleSlug);
  if (!allowed) return { ok: false, error: "Title not unlocked" };

  const { data: existing } = await admin
    .from("livecircuit_fan_gamification")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    await refreshGamificationProfile(admin, userId);
  }

  await admin
    .from("livecircuit_fan_gamification")
    .update({ equipped_title_slug: titleSlug, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  return { ok: true };
}
