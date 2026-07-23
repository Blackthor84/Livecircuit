import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type VenueLoyaltyLevel = "bronze" | "silver" | "gold" | "diamond";

export type LoyaltyTransactionReason =
  | "attendance"
  | "merchandise"
  | "check_in"
  | "referral"
  | "artist_support"
  | "review"
  | "share"
  | "admin_adjustment"
  | "reward_redemption";

const LEVEL_ORDER: VenueLoyaltyLevel[] = ["bronze", "silver", "gold", "diamond"];

const LEVEL_THRESHOLDS: Record<VenueLoyaltyLevel, number> = {
  bronze: 0,
  silver: 250,
  gold: 1000,
  diamond: 3000,
};

export const LOYALTY_POINT_AWARDS: Partial<Record<LoyaltyTransactionReason, number>> = {
  check_in: 25,
  review: 50,
  attendance: 100,
  share: 15,
};

export function levelFromPoints(points: number): VenueLoyaltyLevel {
  if (points >= LEVEL_THRESHOLDS.diamond) return "diamond";
  if (points >= LEVEL_THRESHOLDS.gold) return "gold";
  if (points >= LEVEL_THRESHOLDS.silver) return "silver";
  return "bronze";
}

export function pointsToNextLevel(points: number): {
  current: VenueLoyaltyLevel;
  next: VenueLoyaltyLevel | null;
  currentThreshold: number;
  nextThreshold: number | null;
  progressPct: number;
} {
  const current = levelFromPoints(points);
  const idx = LEVEL_ORDER.indexOf(current);
  const next = idx < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[idx + 1]! : null;
  const currentThreshold = LEVEL_THRESHOLDS[current];
  const nextThreshold = next ? LEVEL_THRESHOLDS[next] : null;

  let progressPct = 100;
  if (nextThreshold != null) {
    const span = nextThreshold - currentThreshold;
    progressPct = span > 0 ? Math.min(100, Math.round(((points - currentThreshold) / span) * 100)) : 0;
  }

  return { current, next, currentThreshold, nextThreshold, progressPct };
}

type BadgeCriteria = {
  minPoints?: number;
  minLevel?: VenueLoyaltyLevel;
  minCheckIns?: number;
  hasReview?: boolean;
};

function levelMeets(minLevel: VenueLoyaltyLevel, actual: VenueLoyaltyLevel) {
  return LEVEL_ORDER.indexOf(actual) >= LEVEL_ORDER.indexOf(minLevel);
}

export async function getOrCreateLoyaltyProfile(
  supabase: SupabaseClient,
  venueId: string,
  userId: string
) {
  const { data: existing } = await supabase
    .from("venue_loyalty_profiles")
    .select("id, points, level")
    .eq("venue_id", venueId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("venue_loyalty_profiles")
    .insert({ venue_id: venueId, user_id: userId, points: 0, level: "bronze" })
    .select("id, points, level")
    .single();

  if (error) throw new Error(error.message);
  return created;
}

export async function countUserCheckIns(supabase: SupabaseClient, venueId: string, userId: string) {
  const { count } = await supabase
    .from("venue_check_ins")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", venueId)
    .eq("user_id", userId);
  return count ?? 0;
}

export async function userHasVenueReview(
  supabase: SupabaseClient,
  venueId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("venue_reviews")
    .select("id")
    .eq("venue_id", venueId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

async function hasLedgerEntryToday(
  supabase: SupabaseClient,
  profileId: string,
  reason: LoyaltyTransactionReason
) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from("venue_loyalty_ledger")
    .select("id")
    .eq("loyalty_profile_id", profileId)
    .eq("reason", reason)
    .gte("created_at", start.toISOString())
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export type AwardLoyaltyResult =
  | { ok: true; pointsAwarded: number; newPoints: number; newLevel: VenueLoyaltyLevel; badgesEarned: string[] }
  | { ok: false; error: string; skipped?: boolean };

export async function awardVenueLoyaltyPoints(input: {
  venueId: string;
  userId: string;
  reason: LoyaltyTransactionReason;
  deltaPoints?: number;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
  oncePerDay?: boolean;
}): Promise<AwardLoyaltyResult> {
  const admin = getSupabaseAdmin();
  const delta =
    input.deltaPoints ??
    LOYALTY_POINT_AWARDS[input.reason] ??
    0;

  if (delta === 0) return { ok: false, error: "No points configured", skipped: true };

  try {
    const profile = await getOrCreateLoyaltyProfile(admin, input.venueId, input.userId);

    if (input.oncePerDay) {
      const already = await hasLedgerEntryToday(admin, profile.id as string, input.reason);
      if (already) return { ok: false, error: "Already awarded today", skipped: true };
    }

    const newPoints = Math.max(0, (profile.points as number) + delta);
    const newLevel = levelFromPoints(newPoints);

    const { error: ledgerError } = await admin.from("venue_loyalty_ledger").insert({
      loyalty_profile_id: profile.id,
      delta_points: delta,
      reason: input.reason,
      reference_type: input.referenceType ?? null,
      reference_id: input.referenceId ?? null,
      metadata: input.metadata ?? {},
    });

    if (ledgerError) return { ok: false, error: ledgerError.message };

    const { error: updateError } = await admin
      .from("venue_loyalty_profiles")
      .update({ points: newPoints, level: newLevel })
      .eq("id", profile.id);

    if (updateError) return { ok: false, error: updateError.message };

    const badgesEarned = await evaluateAndGrantVenueBadges(admin, {
      venueId: input.venueId,
      userId: input.userId,
      points: newPoints,
      level: newLevel,
    });

    await refreshVenueTopFansLeaderboard(admin, input.venueId);

    return {
      ok: true,
      pointsAwarded: delta,
      newPoints,
      newLevel,
      badgesEarned,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Loyalty award failed" };
  }
}

async function evaluateAndGrantVenueBadges(
  supabase: SupabaseClient,
  ctx: { venueId: string; userId: string; points: number; level: VenueLoyaltyLevel }
): Promise<string[]> {
  const [badges, checkIns, hasReview, earnedRows] = await Promise.all([
    supabase
      .from("venue_badges")
      .select("id, slug, name, description, criteria")
      .eq("venue_id", ctx.venueId),
    countUserCheckIns(supabase, ctx.venueId, ctx.userId),
    userHasVenueReview(supabase, ctx.venueId, ctx.userId),
    supabase
      .from("user_venue_badges")
      .select("badge_id")
      .eq("user_id", ctx.userId),
  ]);

  const earnedSet = new Set((earnedRows.data ?? []).map((r) => r.badge_id as string));
  const newlyEarned: string[] = [];

  for (const badge of badges.data ?? []) {
    if (earnedSet.has(badge.id as string)) continue;

    const criteria = (badge.criteria ?? {}) as BadgeCriteria;
    let qualifies = true;

    if (criteria.minPoints != null && ctx.points < criteria.minPoints) qualifies = false;
    if (criteria.minLevel != null && !levelMeets(criteria.minLevel, ctx.level)) qualifies = false;
    if (criteria.minCheckIns != null && checkIns < criteria.minCheckIns) qualifies = false;
    if (criteria.hasReview && !hasReview) qualifies = false;

    if (!qualifies) continue;

    const { error } = await supabase.from("user_venue_badges").insert({
      badge_id: badge.id,
      user_id: ctx.userId,
    });

    if (error) continue;

    newlyEarned.push(badge.name as string);

    await supabase.from("venue_posts").insert({
      venue_id: ctx.venueId,
      user_id: ctx.userId,
      kind: "achievement",
      title: `Badge unlocked: ${badge.name}`,
      body: (badge.description as string) ?? "New venue achievement earned.",
    });
  }

  return newlyEarned;
}

export async function reevaluateVenueLoyaltyBadges(venueId: string, userId: string): Promise<string[]> {
  const admin = getSupabaseAdmin();
  const profile = await getOrCreateLoyaltyProfile(admin, venueId, userId);
  return evaluateAndGrantVenueBadges(admin, {
    venueId,
    userId,
    points: profile.points as number,
    level: profile.level as VenueLoyaltyLevel,
  });
}

async function refreshVenueTopFansLeaderboard(supabase: SupabaseClient, venueId: string) {
  const { data: rows } = await supabase
    .from("venue_loyalty_profiles")
    .select("points, profiles(display_name)")
    .eq("venue_id", venueId)
    .order("points", { ascending: false })
    .limit(10);

  const payload = (rows ?? []).map((row, i) => {
    const profileRaw = row.profiles as { display_name: string | null } | { display_name: string | null }[] | null;
    const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
    return {
      rank: i + 1,
      name: profile?.display_name ?? "Fan",
      score: row.points as number,
    };
  });

  await supabase.from("venue_leaderboard_snapshots").upsert(
    {
      venue_id: venueId,
      period_key: "all_time",
      category: "top_fans",
      payload,
      computed_at: new Date().toISOString(),
    },
    { onConflict: "venue_id,period_key,category" }
  );
}

export async function refreshVenueLoyaltyLeaderboard(venueId: string) {
  const admin = getSupabaseAdmin();
  await refreshVenueTopFansLeaderboard(admin, venueId);
}
