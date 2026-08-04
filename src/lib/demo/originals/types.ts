/** LiveCircuit Originals — fictional artist universe types. */

export type OriginalsGenre =
  | "Modern Pop"
  | "Alternative Pop"
  | "Dream Pop"
  | "Latin Pop"
  | "Rock"
  | "Alternative Rock"
  | "Hard Rock"
  | "Indie Rock"
  | "Indie Pop"
  | "Country"
  | "Americana"
  | "Folk"
  | "Acoustic"
  | "Hip-Hop"
  | "R&B"
  | "Contemporary R&B"
  | "Alternative R&B"
  | "Neo Soul"
  | "Soul"
  | "EDM"
  | "House"
  | "Electronic"
  | "DJ"
  | "Electronic Duo"
  | "Pop/R&B"
  | "Jazz"
  | "Blues"
  | "Punk"
  | "Metal"
  | "Afrobeats"
  | "Singer Songwriter";

export type OriginalsRosterGroup =
  | "pop"
  | "rnb-solo"
  | "rnb-group"
  | "hip-hop"
  | "rock"
  | "alternative"
  | "country"
  | "americana-folk"
  | "indie"
  | "edm-dj"
  | "acoustic"
  | "mixed";

export type OriginalsActType = "solo" | "duo" | "band" | "group";

export type OriginalsArtistStatus = "LIVE" | "ON TOUR" | "REHEARSAL" | "IDLE";

export type OriginalsPoseId =
  | "hero"
  | "full-body"
  | "walk"
  | "perform"
  | "crowd"
  | "close-up"
  | "profile"
  | "back"
  | "instrument"
  | "mic"
  | "promo";

export type OriginalsBrandColors = {
  primary: string;
  secondary: string;
  accent: string;
  gradient: string;
};

export type OriginalsMerchItem = {
  id: string;
  name: string;
  price: number;
};

export type OriginalsTourDate = {
  city: string;
  venue: string;
  date: string;
};

export type OriginalsArtist = {
  id: string;
  slug: string;
  name: string;
  genre: OriginalsGenre;
  rosterGroup: OriginalsRosterGroup;
  actType: OriginalsActType;
  hometown: string;
  bio: string;
  tagline: string;
  aesthetic: string;
  brand: OriginalsBrandColors;
  avatar: string;
  logoMark: string;
  monthlyListeners: number;
  followers: number;
  fanDemographic: string;
  currentTour: string;
  upcomingDates: OriginalsTourDate[];
  merch: OriginalsMerchItem[];
  albumTitle: string;
  singleTitle: string;
  /** Maps to shared performer PNG category pool */
  poseCategory: string;
  /** Agency / live demo fields */
  manager: string;
  liveAudience: number;
  revenueTonight: number;
  merchSalesTonight: number;
  showsScheduled: number;
  status: OriginalsArtistStatus;
  growthPct: number;
  featured?: boolean;
};

export type AgencyRosterEntry = {
  id: string;
  name: string;
  avatar: string;
  genre: string;
  show: string;
  manager: string;
  liveAudience: number;
  revenue: number;
  followers: number;
  shows: number;
  merch: number;
  status: OriginalsArtistStatus;
  color: string;
  growth: number;
};
