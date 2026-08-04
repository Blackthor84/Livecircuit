/** Platform-wide Artist Bible constants */

export const PRIMARY_ARTIST_DEMO_ID = "nova-lane";
export const DEFAULT_FAN_HEADLINER_ID = "nova-lane";

export const FEATURED_ARTIST_IDS = [
  "nova-lane",
  "echo-drive",
  "neon-atlas",
  "the-wild-pines",
  "rebel-phase",
  "velvet-static",
  "kings-roses",
  "midnight-saints",
  "velvet-midnight",
  "aurora-blue",
  "crimson-harbor",
  "luna-coast",
] as const;

/** Venue → headliner mapping for Fan Demo (never random) */
export const VENUE_HEADLINER_MAP: Record<string, string> = {
  boston: "nova-lane",
  chicago: "echo-drive",
  miami: "neon-atlas",
  seattle: "velvet-static",
};

export const ARTIST_BIBLE_VERSION = 1;
