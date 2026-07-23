import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import {
  computeArtistMomentum,
  upsertMomentumSnapshot,
} from "@/lib/services/artist-momentum.service";
import type { ArtistMomentumReport, MomentumTrend } from "@/lib/types/artist-momentum";

function demoMomentum(artistId: string): ArtistMomentumReport {
  const history = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return {
      date: d.toISOString().slice(0, 10),
      score: 78 + i + (i % 3),
      trend: (i > 10 ? "up" : "stable") as MomentumTrend,
    };
  });

  return {
    artistId,
    score: 94,
    trend: "up",
    trendDelta: 6,
    factors: {
      revenue: 88,
      growth: 92,
      followers: 85,
      engagement: 79,
      tips: 81,
      reviews: 90,
      ticketSales: 87,
      watchTime: 76,
      returningViewers: 83,
      cancellation: 95,
      audienceSatisfaction: 91,
    },
    labels: {
      revenue: "Revenue",
      growth: "Growth",
      followers: "Followers",
      engagement: "Engagement",
      tips: "Tips",
      reviews: "Reviews",
      ticketSales: "Ticket sales",
      watchTime: "Watch time",
      returningViewers: "Returning viewers",
      cancellation: "Reliability (low cancel rate)",
      audienceSatisfaction: "Audience satisfaction",
    },
    history,
    computedAt: new Date().toISOString(),
  };
}

export async function getArtistMomentumReport(artistId: string): Promise<ArtistMomentumReport | null> {
  if (!isSupabaseConfigured()) return demoMomentum(artistId);

  const supabase = await createClient();
  const core = await computeArtistMomentum(supabase, artistId);
  await upsertMomentumSnapshot(supabase, core);

  const { data: historyRows } = await supabase
    .from("artist_momentum_snapshots")
    .select("bucket_date, score, trend")
    .eq("artist_id", artistId)
    .order("bucket_date", { ascending: true })
    .limit(90);

  const history = (historyRows ?? []).map((r) => ({
    date: r.bucket_date as string,
    score: r.score as number,
    trend: r.trend as MomentumTrend,
  }));

  return { ...core, history };
}

export async function getArtistMomentumForUser(userId: string) {
  if (!isSupabaseConfigured()) {
    return { artist: { id: "demo", slug: "demo-artist" }, report: demoMomentum("demo") };
  }

  const supabase = await createClient();
  const { data: artist } = await supabase
    .from("artists")
    .select("id, slug")
    .eq("user_id", userId)
    .maybeSingle();

  if (!artist) return null;

  const report = await getArtistMomentumReport(artist.id as string);
  if (!report) return null;

  return { artist: { id: artist.id as string, slug: artist.slug as string }, report };
}

export async function getPublicArtistMomentum(artistId: string): Promise<ArtistMomentumReport | null> {
  if (!isSupabaseConfigured()) return demoMomentum(artistId);
  return getArtistMomentumReport(artistId);
}
