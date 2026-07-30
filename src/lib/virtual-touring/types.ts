export type TourStopLocation = {
  tourCity: string | null;
  tourStateCode: string | null;
  tourStateName: string | null;
};

export type FanProfileLocation = {
  cityId?: string | null;
  stateId?: string | null;
  countryId?: string | null;
  cityName?: string | null;
  stateCode?: string | null;
  countryCode?: string | null;
};

export type TouringEventContext = TourStopLocation & {
  audienceMode: import("@/types/database").EventAudienceMode;
  localPriorityMinutes: number;
  doorsOpenAt: string | null;
  showStartsAt: string | null;
  inviteCode?: string | null;
};

export type TourStopPresentation = {
  tourTitle: string;
  tourSlug: string;
  stopCity: string;
  stopStateName: string;
  stopStateCode: string | null;
  eventDateLabel: string;
  doorsOpenLabel: string | null;
  showStartsLabel: string;
  venueName: string | null;
  venueSlug: string | null;
  audienceModeLabel: string;
  skylineAccent: string;
};

export type VirtualTouringAccessResult = {
  allowed: boolean;
  isHomeCrowd: boolean;
  canAccessLocalChat: boolean;
  inPriorityWindow: boolean;
  priorityOpensAt: string | null;
  publicOpensAt: string | null;
  denialMessage: string | null;
  audienceMode: import("@/types/database").EventAudienceMode;
};

export type TourPassportStats = {
  citiesVisited: string[];
  statesVisited: string[];
  toursCompleted: number;
  artistsFollowedOnTour: number;
  completionPercent: number;
  distinctCityCount: number;
  distinctStateCount: number;
};

export type TourDiscoveryFilter =
  | "near_me"
  | "my_state"
  | "country"
  | "worldwide"
  | "upcoming_stops";

export type VirtualTouringAnalyticsSummary = {
  attendanceByCity: { city: string; stateCode: string | null; viewers: number }[];
  attendanceByState: { stateCode: string; viewers: number }[];
  localVsRemote: { local: number; remote: number };
  avgWatchTimeByCity: { city: string; seconds: number }[];
  topLoyalFans: { userId: string; displayName: string | null; stampCount: number }[];
  passportCompletionRate: number;
  strongestLocalArtists: { artistId: string; stageName: string; localRatio: number }[];
  strongestNationalArtists: { artistId: string; stageName: string; remoteRatio: number }[];
};
