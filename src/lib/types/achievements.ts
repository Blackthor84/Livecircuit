import type { LivecircuitAchievementCategory } from "@/lib/constants/achievements";

export type AchievementMetrics = {
  ticket_count: number;
  vip_ticket_count: number;
  friend_count: number;
  review_count: number;
  tip_count: number;
  tip_total_cents: number;
  merch_order_count: number;
  festival_pass_count: number;
  distinct_venues: number;
  distinct_countries: number;
  distinct_genres: number;
  season_points_max: number;
  marketplace_bookings: number;
  venue_check_ins: number;
  passport_achievements: number;
  coin_earned_total: number;
};

export type AchievementDefRow = {
  slug: string;
  category: LivecircuitAchievementCategory;
  name: string;
  description: string;
  icon: string | null;
  metric: keyof AchievementMetrics | string;
  targetValue: number;
  tier: number;
  sortOrder: number;
  hidden: boolean;
};

export type AchievementEntry = AchievementDefRow & {
  categoryLabel: string;
  categoryBlurb: string;
  currentValue: number;
  earned: boolean;
  earnedAt: string | null;
  progressPercent: number;
};

export type AchievementCategoryGroup = {
  category: LivecircuitAchievementCategory;
  categoryLabel: string;
  categoryBlurb: string;
  earnedCount: number;
  totalCount: number;
  entries: AchievementEntry[];
};

export type AchievementsReport = {
  userId: string;
  displayName: string | null;
  totalEarned: number;
  totalAvailable: number;
  categories: AchievementCategoryGroup[];
  metrics: AchievementMetrics;
  computedAt: string;
};
