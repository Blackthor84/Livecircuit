import type { GamificationTitleSlug } from "@/lib/constants/gamification";

export type QuestCadence = "daily" | "weekly" | "monthly";

export type GamificationMetrics = {
  daily_login: number;
  reviews_today: number;
  checkins_today: number;
  tips_today: number;
  friend_messages_today: number;
  tickets_week: number;
  reviews_week: number;
  tips_week: number;
  friends_week: number;
  xp_week: number;
  tickets_month: number;
  venues_month: number;
  festivals_month: number;
  achievements_month: number;
  xp_month: number;
};

export type QuestEntry = {
  slug: string;
  cadence: QuestCadence;
  name: string;
  description: string;
  icon: string | null;
  metric: keyof GamificationMetrics | string;
  targetValue: number;
  xpReward: number;
  coinReward: number;
  periodKey: string;
  currentValue: number;
  completed: boolean;
  completedAt: string | null;
  progressPercent: number;
};

export type GamificationLeaderboardRow = {
  rank: number;
  userId: string;
  displayName: string;
  xp: number;
  level: number;
  titleLabel: string;
};

export type GamificationReport = {
  userId: string;
  displayName: string | null;
  xp: number;
  level: number;
  prestige: number;
  equippedTitleSlug: GamificationTitleSlug | null;
  equippedTitleLabel: string;
  levelProgress: { current: number; needed: number; percent: number };
  daily: QuestEntry[];
  weekly: QuestEntry[];
  monthly: QuestEntry[];
  unlockedTitles: { slug: string; label: string }[];
  leaderboard: GamificationLeaderboardRow[];
  computedAt: string;
};
