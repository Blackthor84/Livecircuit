import type { WalkOfFameCriterion } from "@/lib/constants/walk-of-fame";

export type WalkOfFameStar = {
  criterion: WalkOfFameCriterion;
  criterionLabel: string;
  blurb: string;
  earnedAt: string;
  metricValue: number;
  summary: string;
};

export type WalkOfFameArtistEntry = {
  artistId: string;
  slug: string;
  stageName: string;
  bannerUrl: string | null;
  verified: boolean;
  starCount: number;
  stars: WalkOfFameStar[];
  fanVoteCount: number;
};

export type WalkOfFameHubReport = {
  artists: WalkOfFameArtistEntry[];
  totalStars: number;
  computedAt: string;
};

export type ArtistWalkOfFameReport = WalkOfFameArtistEntry & {
  viewerHasVoted: boolean;
  computedAt: string;
};
