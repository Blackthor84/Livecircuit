/**
 * @deprecated Import from `@/data/demo/artists` instead.
 * Demo-only re-exports — never use on production-facing pages.
 */
import {
  getArtistById,
  getArtistByStageName,
  getPrimaryDemoArtist,
  getFeaturedArtists,
  getAgencyRoster,
  getFanChatMessages,
  getArtistChatMessages,
  getFanMerchForDemo,
  getAgencyNotifications,
  getArtistLiveStats,
  getVenueHeadliner,
  getLiveNotifications,
  getStagePerformerSelection,
  resolvePoseImage,
  getArtistBrand,
  getAvailablePoses,
  PRIMARY_ARTIST_DEMO_ID,
  DEFAULT_FAN_HEADLINER_ID,
  FEATURED_ARTIST_IDS,
  DEMO_ARTISTS,
} from "@/data/demo/artists";
import type { DemoArtistEntry } from "@/data/demo/artists/types";

export {
  getArtistById as getOriginalById,
  getArtistByStageName as getOriginalBySlug,
  getPrimaryDemoArtist,
  getFeaturedArtists as getFeaturedOriginals,
  getAgencyRoster,
  getFanChatMessages,
  getArtistChatMessages,
  getFanMerchForDemo as getFanMerch,
  getAgencyNotifications,
  getArtistLiveStats,
  getVenueHeadliner,
  getLiveNotifications,
  getStagePerformerSelection,
  resolvePoseImage as resolveStageImage,
  getAvailablePoses,
  PRIMARY_ARTIST_DEMO_ID,
  DEFAULT_FAN_HEADLINER_ID,
  FEATURED_ARTIST_IDS as FEATURED_ORIGINALS_IDS,
  DEMO_ARTISTS as LIVECIRCUIT_ORIGINALS,
};

export function resolveHeroImage(artist: DemoArtistEntry): string {
  return resolvePoseImage(artist, "hero");
}

export function resolveAvatarGradient(artist: DemoArtistEntry): string {
  return getArtistBrand(artist).gradientClass;
}

export type { DemoArtistEntry as OriginalsArtist } from "@/data/demo/artists/types";
