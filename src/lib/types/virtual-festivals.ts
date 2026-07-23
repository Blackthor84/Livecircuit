export type FestivalStatus = "scheduled" | "live" | "ended" | "archived";

export type FestivalSummary = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  status: FestivalStatus;
  startsAt: string;
  endsAt: string;
  bannerIcon: string | null;
  venueCount: number;
};

export type FestivalMapPin = {
  venueSlug: string;
  venueName: string;
  label: string | null;
  mapX: number;
  mapY: number;
};

export type FestivalScheduleSlot = {
  id: string;
  title: string;
  slotType: "performance" | "meet_greet";
  startsAt: string;
  endsAt: string;
  isVipOnly: boolean;
  venueSlug: string | null;
  venueName: string | null;
  artistSlug: string | null;
  artistName: string | null;
  eventSlug: string | null;
  dayLabel: string;
};

export type FestivalPassTier = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  isVipUpgrade: boolean;
  perks: string[];
  owned: boolean;
};

export type FestivalCollectible = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  rarity: string;
  earned: boolean;
};

export type FestivalAchievement = {
  id: string;
  slug: string;
  name: string;
  description: string;
  earned: boolean;
};

export type FestivalLeaderboardRow = {
  rank: number;
  userId: string;
  displayName: string;
  points: number;
  isYou?: boolean;
};

export type FestivalDetail = FestivalSummary & {
  description: string | null;
  mapPins: FestivalMapPin[];
  schedule: FestivalScheduleSlot[];
  passTiers: FestivalPassTier[];
  collectibles: FestivalCollectible[];
  achievements: FestivalAchievement[];
  leaderboard: FestivalLeaderboardRow[];
  userPoints: number | null;
};

export type FestivalsHubReport = {
  live: FestivalSummary[];
  upcoming: FestivalSummary[];
  past: FestivalSummary[];
  computedAt: string;
};
