export type FanPassportStamp = {
  id: string;
  eventId: string;
  venueName: string | null;
  cityName: string | null;
  stateCode: string | null;
  countryCode: string | null;
  countryName: string | null;
  artistName: string | null;
  artistCategory: string | null;
  eventTitle: string;
  attendedAt: string;
  isVip: boolean;
  isSpecial: boolean;
};

export type FanPassportAchievementDef = {
  slug: string;
  name: string;
  description: string;
  metric: string;
  targetValue: number;
  sortOrder: number;
};

export type FanPassportAchievementProgress = FanPassportAchievementDef & {
  currentValue: number;
  earned: boolean;
  earnedAt: string | null;
};

export type FanPassportProgress = {
  stampCount: number;
  distinctCountries: number;
  distinctUsStates: number;
  vipStamps: number;
  comedyStamps: number;
  specialStamps: number;
  countryTarget: number;
  usStateTarget: number;
};

export type FanPassportReport = {
  userId: string;
  passportNumber: string;
  displayName: string | null;
  stamps: FanPassportStamp[];
  achievements: FanPassportAchievementProgress[];
  progress: FanPassportProgress;
  computedAt: string;
};
