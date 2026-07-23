export type VenueHofEntry = {
  category: string;
  categoryLabel: string;
  blurb: string;
  rank: number;
  holderType: "artist" | "event" | "fan";
  displayName: string;
  subtitle: string | null;
  metricValue: number;
  metricLabel: string;
  linkHref: string | null;
};

export type VenueHallOfFameReport = {
  venueId: string;
  venueSlug: string;
  venueName: string;
  isHallOfFameVenue: boolean;
  entries: VenueHofEntry[];
  computedAt: string;
};
