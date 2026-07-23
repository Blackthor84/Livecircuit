export type SeasonStatus = "scheduled" | "active" | "archived";

export type SeasonProfileFrame = {
  slug: string;
  label: string;
  ringClass: string;
};

export type SeasonRewardTier = {
  tier: string;
  points: number;
  reward: string;
};

export type SeasonBadge = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string | null;
  pointsRequired: number;
  earned: boolean;
  earnedAt: string | null;
};

export type SeasonMerchItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  limitedQuantity: number | null;
  soldOut: boolean;
};

export type SeasonLeaderboardRow = {
  rank: number;
  userId: string;
  displayName: string;
  points: number;
  isYou?: boolean;
};

export type SeasonVenueDecoration = {
  venueSlug: string;
  venueName: string;
  themeName: string;
  themeIcon: string | null;
};

export type SeasonSummary = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  status: SeasonStatus;
  startsAt: string;
  endsAt: string;
  themeSlug: string | null;
  themeName: string | null;
  decorationIcon: string | null;
};

export type SeasonUserStats = {
  points: number;
  ticketsCount: number;
  stampsCount: number;
  tipsCount: number;
  merchOrdersCount: number;
  rank: number | null;
};

export type SeasonDetail = SeasonSummary & {
  description: string | null;
  profileFrame: SeasonProfileFrame | null;
  rewards: SeasonRewardTier[];
  badges: SeasonBadge[];
  merch: SeasonMerchItem[];
  leaderboard: SeasonLeaderboardRow[];
  decoratedVenues: SeasonVenueDecoration[];
  archiveStats: Record<string, number | string>;
  userStats: SeasonUserStats | null;
};

export type SeasonsHubReport = {
  active: SeasonSummary[];
  upcoming: SeasonSummary[];
  archive: SeasonSummary[];
  computedAt: string;
};
