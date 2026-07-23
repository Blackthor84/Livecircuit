import type { AchievementMetrics } from "@/lib/types/achievements";

export function metricValue(metric: string, metrics: AchievementMetrics): number {
  if (metric in metrics) return metrics[metric as keyof AchievementMetrics] ?? 0;
  return 0;
}

export function achievementProgressPercent(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

export function isAchievementEarned(metric: string, target: number, metrics: AchievementMetrics): boolean {
  return metricValue(metric, metrics) >= target;
}

export const EMPTY_ACHIEVEMENT_METRICS: AchievementMetrics = {
  ticket_count: 0,
  vip_ticket_count: 0,
  friend_count: 0,
  review_count: 0,
  tip_count: 0,
  tip_total_cents: 0,
  merch_order_count: 0,
  festival_pass_count: 0,
  distinct_venues: 0,
  distinct_countries: 0,
  distinct_genres: 0,
  season_points_max: 0,
  marketplace_bookings: 0,
  venue_check_ins: 0,
  passport_achievements: 0,
  coin_earned_total: 0,
};
