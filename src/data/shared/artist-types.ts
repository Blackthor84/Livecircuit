/**
 * Shared artist types — used by both demo and production data layers.
 * UI components should depend on these types, not on demo-specific modules.
 */
import type { ArtistEnvironment, ArtistIdentity, ArtistVisibility } from "@/data/shared/environment";

export type ArtistGenre =
  | "Pop"
  | "Alternative Pop"
  | "Dream Pop"
  | "Latin Pop"
  | "Rock"
  | "Alternative Rock"
  | "Hard Rock"
  | "Metal"
  | "Country"
  | "Americana"
  | "Folk"
  | "Singer Songwriter"
  | "Hip Hop"
  | "R&B"
  | "Contemporary R&B"
  | "Alternative R&B"
  | "Neo Soul"
  | "Soul"
  | "Indie"
  | "Indie Pop"
  | "Indie Rock"
  | "Electronic"
  | "EDM"
  | "House"
  | "DJ"
  | "Electronic Duo"
  | "Pop/R&B"
  | "Jazz"
  | "Blues"
  | "Punk"
  | "Afrobeats"
  | "Acoustic";

export type ArtistActType = "solo" | "duo" | "band" | "group";
export type ArtistLiveStatus = "LIVE" | "ON TOUR" | "REHEARSAL" | "IDLE";

export type ArtistImagePose =
  | "hero"
  | "portrait"
  | "transparent"
  | "performance"
  | "walk"
  | "crowd"
  | "closeUp"
  | "profile"
  | "back"
  | "instrument"
  | "mic"
  | "promo"
  | "vip"
  | "arenaBanner";

export type ArtistAppearance = {
  skinTone: string;
  hairTexture: string;
  hairColor: string;
  eyeColor: string;
  faceDescription: string;
  bodyType: string;
  height: string;
  fashionStyle: string;
  accessories: string[];
  stageOutfit: string;
  streetOutfit: string;
  performanceOutfit: string;
};

export type ArtistBrand = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  gradientClass: string;
  typography: string;
  logoPath: string;
  brandIconPath: string;
  brandDescription: string;
  brandVoice: string;
};

export type ArtistImages = {
  heroImage: string;
  portraitImage: string;
  transparentPNG: string;
  tourPoster: string;
  albumCover: string;
  arenaBanner: string;
  vipImage: string;
  poses: Partial<Record<ArtistImagePose, string>>;
};

export type ArtistMerchItem = {
  id: string;
  name: string;
  price: number;
  imagePath: string;
};

export type ArtistShow = {
  city: string;
  venue: string;
  date: string;
  ticketPrice?: number;
  vipPrice?: number;
};

export type ArtistTour = {
  name: string;
  posterPath: string;
  upcomingShows: ArtistShow[];
};

export type ArtistPerformance = {
  signatureMove: string;
  signatureLighting: string;
  signatureAnimation: string;
  preferredArenaTheme: string;
  preferredPyro: boolean;
  preferredConfetti: boolean;
  preferredLighting: string[];
  preferredCameraAngles: string[];
  musicStyle: string;
  performanceStyle: string;
};

export type ArtistSocialLinks = {
  livecircuit: string;
  website?: string;
  instagram?: string;
  tiktok?: string;
};

/** Platform artist — works for demo and production performers */
export type PlatformArtist = ArtistIdentity & {
  id: string;
  stageName: string;
  realName: string;
  genre: ArtistGenre;
  subGenre: string;
  hometown: string;
  country: string;
  yearsActive: number;
  label: string;
  management: string;
  bio: string;
  brand: ArtistBrand;
  appearance: ArtistAppearance;
  images: ArtistImages;
  merchCollection: ArtistMerchItem[];
  followers: number;
  monthlyListeners: number;
  fanRating: number;
  averageAttendance: number;
  ticketPrice: number;
  vipPrice: number;
  merchRevenue: number;
  tourRevenue: number;
  careerRevenue: number;
  verified: boolean;
  featured: boolean;
  socialLinks: ArtistSocialLinks;
  currentTour: ArtistTour;
  favoriteVenue: string;
  performance: ArtistPerformance;
  personality: string;
  fanDemographics: string;
  targetAudience: string;
  catchPhrase: string;
  actType: ArtistActType;
  liveStatus: ArtistLiveStatus;
  liveAudience: number;
  revenueTonight: number;
  growthPct: number;
  showsScheduled: number;
  albumTitle: string;
  singleTitle: string;
  avatarInitials: string;
};

export type DemoArtistEntry = PlatformArtist & {
  isDemoArtist: true;
  visibility: "demo-only";
  environment: "demo";
  /** Maps to shared stage PNG pool until per-artist assets exist */
  poseCategory: string;
};

export type ProductionArtistEntry = PlatformArtist & {
  isDemoArtist: false;
  visibility: "public";
  environment: "production";
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
  status: ArtistLiveStatus;
  color: string;
  growth: number;
};

export type { ArtistEnvironment, ArtistVisibility };
