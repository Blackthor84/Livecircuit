import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { buildTourPlannerReport } from "@/lib/services/tour-planner.service";
import type { TourPlannerReport, TourPlannerRunRow } from "@/lib/types/tour-planner";
import { demoHeatPoints } from "@/lib/data/demo";
import type { TourPlannerCityRecommendation } from "@/lib/types/tour-planner";

function demoPlan(artistId: string): TourPlannerReport {
  const recommendations: TourPlannerCityRecommendation[] = [
    {
      cityLabel: "Boston",
      region: "Boston",
      stateCode: "MA",
      venueId: null,
      venueSlug: null,
      fanScore: 92,
      ticketHistory: 48,
      revenuePredictionCents: 120_000,
      expectedAttendance: 400,
      riskScore: 18,
      travelScore: null,
      profitEstimateCents: 86_400,
      growthOpportunityPct: 12,
      suggestedDayOfWeek: "Friday",
      suggestedHourLocal: 19,
      heatWeight: 820,
      rationale: ["820 fans mapped near Boston.", "48 historical tickets sold."],
    },
    {
      cityLabel: "Buffalo",
      region: "Buffalo",
      stateCode: "NY",
      venueId: null,
      venueSlug: "buffalo-arena",
      fanScore: 78,
      ticketHistory: 22,
      revenuePredictionCents: 62_500,
      expectedAttendance: 250,
      riskScore: 24,
      travelScore: null,
      profitEstimateCents: 45_000,
      growthOpportunityPct: 18,
      suggestedDayOfWeek: "Friday",
      suggestedHourLocal: 20,
      heatWeight: 540,
      rationale: ["Strong regional fan cluster.", "Matched LiveCircuit venue Buffalo."],
    },
    {
      cityLabel: "Tampa",
      region: "Tampa",
      stateCode: "FL",
      venueId: null,
      venueSlug: null,
      fanScore: 71,
      ticketHistory: 15,
      revenuePredictionCents: 45_000,
      expectedAttendance: 180,
      riskScore: 32,
      travelScore: null,
      profitEstimateCents: 32_400,
      growthOpportunityPct: 22,
      suggestedDayOfWeek: "Saturday",
      suggestedHourLocal: 19,
      heatWeight: 410,
      rationale: ["Growth market with rising followers."],
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    artistId,
    insights: [
      "Your strongest cities are Boston, Buffalo, Tampa.",
      "Adding Cleveland could increase revenue by ~18%.",
      "Your comedy audience is strongest on Fridays.",
      "Your fans prefer shows between 7–9 PM.",
    ],
    summary: {
      totalRevenuePredictionCents: recommendations.reduce((s, r) => s + r.revenuePredictionCents, 0),
      totalExpectedAttendance: recommendations.reduce((s, r) => s + r.expectedAttendance, 0),
      averageRiskScore: 25,
      averageGrowthOpportunityPct: 17,
      preferredTimeWindow: "Friday 19:00–21:00 local",
      strongestGenreSignal: "comedy",
    },
    recommendations,
    heatMap: {
      points: demoHeatPoints.map((p) => ({ ...p, growthPercent: 15 })),
      topLocations: demoHeatPoints.map((p) => ({ label: p.label, count: p.weight, growthPercent: 15 })),
      totals: { fans: 5000, filteredFans: 5000 },
    },
    scheduling: {
      byDayOfWeek: [
        { day: "Friday", score: 42 },
        { day: "Saturday", score: 38 },
      ],
      byHour: [
        { hour: 19, score: 55 },
        { hour: 20, score: 48 },
      ],
      seasonalMonths: [
        { month: "Jun", ticketIndex: 120 },
        { month: "Jul", ticketIndex: 140 },
      ],
    },
    similarArtistsSignal: { category: "comedy", peerCount: 24, note: "24 peer artists in comedy." },
  };
}

export async function getArtistTourPlannerReport(
  userId: string
): Promise<{ artist: { id: string; slug: string; category: string | null }; plan: TourPlannerReport } | null> {
  if (!isSupabaseConfigured()) {
    return {
      artist: { id: "demo", slug: "demo-artist", category: "comedy" },
      plan: demoPlan("demo"),
    };
  }

  const supabase = await createClient();
  const { data: artist } = await supabase
    .from("artists")
    .select("id, slug, category")
    .eq("user_id", userId)
    .maybeSingle();

  if (!artist) return null;

  const plan = await buildTourPlannerReport(
    supabase,
    artist.id as string,
    (artist.category as string) ?? null
  );

  return {
    artist: {
      id: artist.id as string,
      slug: artist.slug as string,
      category: (artist.category as string) ?? null,
    },
    plan,
  };
}

export async function saveTourPlannerRun(artistId: string, plan: TourPlannerReport) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artist_tour_planner_runs")
    .insert({
      artist_id: artistId,
      status: "completed",
      plan: plan as unknown as Record<string, unknown>,
    })
    .select("id, created_at")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function listTourPlannerRuns(artistId: string, limit = 5): Promise<TourPlannerRunRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artist_tour_planner_runs")
    .select("id, artist_id, status, plan, created_at")
    .eq("artist_id", artistId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as unknown as TourPlannerRunRow[];
}
