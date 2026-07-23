export type VenueTvProgram = {
  id: string;
  programType: string;
  title: string;
  summary: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  linkHref: string | null;
  durationSeconds: number;
};

export type VenueTvReport = {
  venueId: string;
  venueSlug: string;
  venueName: string;
  channelTitle: string;
  tagline: string;
  isOnAir: boolean;
  nowPlaying: VenueTvProgram | null;
  upNext: VenueTvProgram[];
  lineup: VenueTvProgram[];
  byType: Record<string, VenueTvProgram[]>;
  computedAt: string;
};
