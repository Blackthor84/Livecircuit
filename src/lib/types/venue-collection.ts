export type VenueCollectionVisit = {
  venueId: string;
  venueSlug: string;
  venueName: string;
  region: string;
  stateCode: string | null;
  countryCode: string | null;
  visitCount: number;
  lastVisitedAt: string;
  isFavorite: boolean;
  isHidden: boolean;
  isSeasonal: boolean;
  isHallOfFame: boolean;
};

export type VenueCollectionProgress = {
  visitedCount: number;
  totalCollectible: number;
  completionPercent: number;
  favoriteCount: number;
  statesVisited: number;
  statesTotal: number;
  countriesVisited: number;
  countriesTotal: number;
  badgeCount: number;
  hiddenDiscovered: number;
  hiddenTotal: number;
  seasonalVisited: number;
  seasonalTotal: number;
  hallOfFameVisited: number;
  hallOfFameTotal: number;
};

export type VenueCollectionBadge = {
  id: string;
  name: string;
  description: string | null;
  venueName: string | null;
  earnedAt: string;
};

export type VenueCollectionReport = {
  userId: string;
  mostAttended: VenueCollectionVisit | null;
  progress: VenueCollectionProgress;
  visits: VenueCollectionVisit[];
  favorites: VenueCollectionVisit[];
  badges: VenueCollectionBadge[];
  computedAt: string;
};
