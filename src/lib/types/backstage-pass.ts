export type BackstageSubscriptionStatus = "active" | "past_due" | "canceled" | "trialing";

export type BackstagePassPlan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCentsMonthly: number;
  perks: string[];
  discordUrl: string | null;
  earlyTicketHours: number;
  isActive: boolean;
};

export type BackstageAnnouncement = {
  id: string;
  title: string;
  body: string;
  membersOnly: boolean;
  publishedAt: string;
};

export type BackstageCollectible = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  earned: boolean;
};

export type BackstageMemberView = {
  isMember: boolean;
  subscriptionStatus: BackstageSubscriptionStatus | null;
  currentPeriodEnd: string | null;
  discordUrl: string | null;
  collectibles: BackstageCollectible[];
};

export type BackstageArtistAnalytics = {
  activeSubscribers: number;
  mrrCents: number;
  newThisMonth: number;
  totalAllTime: number;
};

export type BackstagePassPage = {
  artistId: string;
  artistSlug: string;
  artistName: string;
  plan: BackstagePassPlan | null;
  announcements: BackstageAnnouncement[];
  member: BackstageMemberView | null;
  isOwner: boolean;
};

export type BackstageArtistHub = {
  artistId: string;
  artistSlug: string;
  plans: BackstagePassPlan[];
  analytics: BackstageArtistAnalytics;
  recentSubscribers: { displayName: string; since: string }[];
};

export const DEFAULT_BACKSTAGE_PERKS = [
  "Private livestreams",
  "Exclusive concerts",
  "Q&A sessions",
  "Backstage chat",
  "Digital collectibles",
  "Early ticket access",
  "Exclusive merchandise",
  "Member-only announcements",
] as const;
