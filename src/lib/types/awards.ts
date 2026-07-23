import type { AwardCategory } from "@/lib/constants/awards";

export type AwardCeremonyStatus = "nomination" | "voting" | "live" | "archived";

export type AwardNominee = {
  id: string;
  category: AwardCategory;
  categoryLabel: string;
  categoryBlurb: string;
  nomineeType: "artist" | "event" | "venue";
  displayName: string;
  subtitle: string | null;
  blurb: string | null;
  imageUrl: string | null;
  linkHref: string | null;
  score: number;
  voteCount: number;
  isWinner: boolean;
  announcedAt: string | null;
};

export type AwardCategoryGroup = {
  category: AwardCategory;
  categoryLabel: string;
  categoryBlurb: string;
  nominees: AwardNominee[];
  viewerNomineeId: string | null;
};

export type AwardCeremonySummary = {
  id: string;
  slug: string;
  title: string;
  year: number;
  status: AwardCeremonyStatus;
  tagline: string | null;
  votingEndsAt: string;
  ceremonyAt: string;
  liveStreamUrl: string | null;
};

export type AwardCeremonyDetail = AwardCeremonySummary & {
  archiveSummary: string | null;
  categories: AwardCategoryGroup[];
  viewerVotes: Partial<Record<AwardCategory, string>>;
  computedAt: string;
};

export type AwardsHubReport = {
  featured: AwardCeremonyDetail | null;
  voting: AwardCeremonySummary[];
  upcomingLive: AwardCeremonySummary[];
  archive: AwardCeremonySummary[];
  computedAt: string;
};
