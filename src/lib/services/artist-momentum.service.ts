import { subDays } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MOMENTUM_FACTOR_LABELS,
  MOMENTUM_WEIGHTS,
  type ArtistMomentumReport,
  type MomentumFactors,
  type MomentumTrend,
} from "@/lib/types/artist-momentum";

function clampScore(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function ratioScore(current: number, prior: number, cap = 100) {
  if (current <= 0 && prior <= 0) return 40;
  if (prior <= 0) return clampScore(50 + Math.min(current, 50));
  const pct = ((current - prior) / prior) * 100;
  return clampScore(50 + pct * 0.5);
}

function logNorm(value: number, scale: number) {
  if (value <= 0) return 15;
  return clampScore(Math.log10(value + 1) * scale);
}

function weightedScore(factors: MomentumFactors) {
  let sum = 0;
  let w = 0;
  for (const key of Object.keys(MOMENTUM_WEIGHTS) as (keyof MomentumFactors)[]) {
    sum += factors[key] * MOMENTUM_WEIGHTS[key];
    w += MOMENTUM_WEIGHTS[key];
  }
  return clampScore(w > 0 ? sum / w : 0);
}

function trendFromDelta(delta: number): MomentumTrend {
  if (delta >= 3) return "up";
  if (delta <= -3) return "down";
  return "stable";
}

export async function computeArtistMomentum(
  supabase: SupabaseClient,
  artistId: string
): Promise<Omit<ArtistMomentumReport, "history">> {
  const now = new Date();
  const d30 = subDays(now, 30).toISOString();
  const d60 = subDays(now, 60).toISOString();

  const { data: artist } = await supabase
    .from("artists")
    .select("follower_count")
    .eq("id", artistId)
    .maybeSingle();

  const { data: events } = await supabase
    .from("events")
    .select("id, status, viewer_count, scheduled_at")
    .eq("artist_id", artistId);

  const eventIds = (events ?? []).map((e) => e.id as string);
  const ended = (events ?? []).filter((e) => e.status === "ended");
  const cancelled = (events ?? []).filter((e) => e.status === "cancelled");
  const totalEvents = (events ?? []).length || 1;

  const [
    ordersRecent,
    ordersPrior,
    tipsRecent,
    tipsPrior,
    ticketsRecent,
    ticketsPrior,
    followersRecent,
    followersPrior,
    reviewsRows,
    chatRecent,
    ordersCancelled,
    ticketsAll,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("total_cents")
      .eq("artist_id", artistId)
      .eq("status", "paid")
      .gte("created_at", d30),
    supabase
      .from("orders")
      .select("total_cents")
      .eq("artist_id", artistId)
      .eq("status", "paid")
      .gte("created_at", d60)
      .lt("created_at", d30),
    supabase.from("tips").select("amount_cents").eq("artist_id", artistId).gte("created_at", d30),
    supabase
      .from("tips")
      .select("amount_cents")
      .eq("artist_id", artistId)
      .gte("created_at", d60)
      .lt("created_at", d30),
    eventIds.length
      ? supabase.from("tickets").select("id").in("event_id", eventIds).gte("created_at", d30)
      : Promise.resolve({ data: [] }),
    eventIds.length
      ? supabase
          .from("tickets")
          .select("id")
          .in("event_id", eventIds)
          .gte("created_at", d60)
          .lt("created_at", d30)
      : Promise.resolve({ data: [] }),
    supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("artist_id", artistId)
      .gte("created_at", d30),
    supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("artist_id", artistId)
      .gte("created_at", d60)
      .lt("created_at", d30),
    eventIds.length
      ? supabase.from("reviews").select("rating").in("event_id", eventIds)
      : Promise.resolve({ data: [] }),
    eventIds.length
      ? supabase
          .from("chat_messages")
          .select("id")
          .in("event_id", eventIds)
          .gte("created_at", d30)
      : Promise.resolve({ data: [] }),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("artist_id", artistId)
      .in("status", ["cancelled", "refunded"]),
    eventIds.length
      ? supabase.from("tickets").select("user_id, event_id").in("event_id", eventIds)
      : Promise.resolve({ data: [] }),
  ]);

  const revRecent = (ordersRecent.data ?? []).reduce((s, o) => s + (o.total_cents as number), 0);
  const revPrior = (ordersPrior.data ?? []).reduce((s, o) => s + (o.total_cents as number), 0);

  const tipsR = (tipsRecent.data ?? []).reduce((s, t) => s + (t.amount_cents as number), 0);
  const tipsP = (tipsPrior.data ?? []).reduce((s, t) => s + (t.amount_cents as number), 0);

  const tixR = ticketsRecent.data?.length ?? 0;
  const tixP = ticketsPrior.data?.length ?? 0;

  const watchTotal = ended.reduce((s, e) => s + ((e.viewer_count as number) ?? 0), 0);

  const ratings = (reviewsRows.data ?? []).map((r) => r.rating as number);
  const avgRating = ratings.length
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : 0;

  const byUser = new Map<string, number>();
  for (const t of ticketsAll.data ?? []) {
    const uid = t.user_id as string;
    byUser.set(uid, (byUser.get(uid) ?? 0) + 1);
  }
  const repeatBuyers = [...byUser.values()].filter((c) => c > 1).length;
  const uniqueBuyers = byUser.size || 1;
  const repeatPct = repeatBuyers / uniqueBuyers;

  const cancelRate = cancelled.length / totalEvents;
  const orderCancelCount = ordersCancelled.count ?? 0;

  const factors: MomentumFactors = {
    revenue: ratioScore(revRecent, revPrior),
    growth: ratioScore(followersRecent.count ?? 0, followersPrior.count ?? 0),
    followers: logNorm(artist?.follower_count as number ?? 0, 22),
    engagement: logNorm(chatRecent.data?.length ?? 0, 18),
    tips: ratioScore(tipsR, tipsP),
    reviews: ratings.length ? clampScore((avgRating / 5) * 100) : 45,
    ticketSales: ratioScore(tixR, tixP),
    watchTime: logNorm(watchTotal, 15),
    returningViewers: clampScore(repeatPct * 100),
    cancellation: clampScore(100 - cancelRate * 200 - Math.min(orderCancelCount * 5, 40)),
    audienceSatisfaction: ratings.length ? clampScore((avgRating / 5) * 92 + 8) : 50,
  };

  const score = weightedScore(factors);

  const { data: yesterday } = await supabase
    .from("artist_momentum_snapshots")
    .select("score")
    .eq("artist_id", artistId)
    .order("bucket_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const priorScore = yesterday?.score as number | undefined;
  const trendDelta = priorScore != null ? score - priorScore : 0;
  const trend = priorScore != null ? trendFromDelta(trendDelta) : "stable";

  return {
    artistId,
    score,
    trend,
    trendDelta,
    factors,
    labels: MOMENTUM_FACTOR_LABELS,
    computedAt: now.toISOString(),
  };
}

export async function upsertMomentumSnapshot(
  supabase: SupabaseClient,
  report: Omit<ArtistMomentumReport, "history">
) {
  const bucketDate = new Date().toISOString().slice(0, 10);
  await supabase.from("artist_momentum_snapshots").upsert(
    {
      artist_id: report.artistId,
      score: report.score,
      trend: report.trend,
      factors: report.factors,
      bucket_date: bucketDate,
    },
    { onConflict: "artist_id,bucket_date" }
  );
}
