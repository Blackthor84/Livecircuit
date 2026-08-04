/**
 * Demo-only artist types.
 * @see src/data/shared/artist-types.ts for platform-wide types
 */
export type {
  ArtistGenre,
  ArtistActType,
  ArtistLiveStatus,
  ArtistImagePose,
  ArtistAppearance,
  ArtistBrand,
  ArtistImages,
  ArtistMerchItem,
  ArtistShow,
  ArtistTour,
  ArtistPerformance,
  ArtistSocialLinks,
  PlatformArtist,
  DemoArtistEntry,
  AgencyRosterEntry,
} from "@/data/shared/artist-types";

/** @deprecated Use DemoArtistEntry */
export type { DemoArtistEntry as ArtistBibleEntry } from "@/data/shared/artist-types";
