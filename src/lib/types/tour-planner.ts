import type { FanHeatResult } from "@/lib/maps/heat-types";

export type TourPlannerCityRecommendation = {
  cityLabel: string;
  region: string;
  stateCode: string | null;
  venueId: string | null;
  venueSlug: string | null;
  fanScore: number;
  ticketHistory: number;
  revenuePredictionCents: number;
  expectedAttendance: number;
  riskScore: number;
  travelScore: number | null;
  profitEstimateCents: number;
  growthOpportunityPct: number;
  suggestedDayOfWeek: string;
  suggestedHourLocal: number;
  heatWeight: number;
  rationale: string[];
};

export type TourPlannerReport = {
  generatedAt: string;
  artistId: string;
  insights: string[];
  summary: {
    totalRevenuePredictionCents: number;
    totalExpectedAttendance: number;
    averageRiskScore: number;
    averageGrowthOpportunityPct: number;
    preferredTimeWindow: string;
    strongestGenreSignal: string | null;
  };
  recommendations: TourPlannerCityRecommendation[];
  heatMap: FanHeatResult;
  scheduling: {
    byDayOfWeek: { day: string; score: number }[];
    byHour: { hour: number; score: number }[];
    seasonalMonths: { month: string; ticketIndex: number }[];
  };
  similarArtistsSignal: { category: string; peerCount: number; note: string } | null;
};

export type TourPlannerRunRow = {
  id: string;
  artist_id: string;
  status: string;
  plan: TourPlannerReport;
  created_at: string;
};
