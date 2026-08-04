import type { CameraAngle, LightingPreset } from "@/lib/demo/cinematic/constants-base";
export type { CameraAngle, LightingPreset, DemoAudience } from "@/lib/demo/cinematic/constants-base";
export { DEMO_META, ARENA_VENUES, TOUR_MAP_NODES, PUBLISH_STEPS, REACTION_EMOJIS } from "@/lib/demo/cinematic/constants-base";
import {
  getAgencyNotifications,
  getAgencyRoster,
  getArtistChatMessages,
  getArtistLiveStats,
  getPrimaryDemoArtist,
  getVenueHeadliner,
  getFanChatMessages,
  getFanMerchForDemo,
  PRIMARY_ARTIST_DEMO_ID,
} from "@/data/demo/artists";

const primary = getPrimaryDemoArtist();
const headliner = getVenueHeadliner("boston");

export const AGENCY_ROSTER = getAgencyRoster(12);
export const AGENCY_NOTIFICATIONS = getAgencyNotifications();
export const ARTIST_LIVE_STATS = getArtistLiveStats(primary);
export const ARTIST_CHAT = getArtistChatMessages(primary);
export const FAN_CHAT_MESSAGES = getFanChatMessages(headliner);
export const FAN_MERCH = getFanMerchForDemo(headliner);
export const DEMO_ARTIST_ID = PRIMARY_ARTIST_DEMO_ID;
