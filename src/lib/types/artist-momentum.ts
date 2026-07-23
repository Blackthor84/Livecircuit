export type MomentumTrend = "up" | "down" | "stable";

export type MomentumFactors = {
  revenue: number;
  growth: number;
  followers: number;
  engagement: number;
  tips: number;
  reviews: number;
  ticketSales: number;
  watchTime: number;
  returningViewers: number;
  cancellation: number;
  audienceSatisfaction: number;
};

export type ArtistMomentumReport = {
  artistId: string;
  score: number;
  trend: MomentumTrend;
  trendDelta: number;
  factors: MomentumFactors;
  labels: Record<keyof MomentumFactors, string>;
  history: { date: string; score: number; trend: MomentumTrend }[];
  computedAt: string;
};

export const MOMENTUM_FACTOR_LABELS: Record<keyof MomentumFactors, string> = {
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
};

export const MOMENTUM_WEIGHTS: Record<keyof MomentumFactors, number> = {
  revenue: 0.14,
  growth: 0.12,
  followers: 0.08,
  engagement: 0.08,
  tips: 0.08,
  reviews: 0.06,
  ticketSales: 0.12,
  watchTime: 0.1,
  returningViewers: 0.08,
  cancellation: 0.06,
  audienceSatisfaction: 0.08,
};
