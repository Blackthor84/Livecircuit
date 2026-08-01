export type TestUserType = "fan" | "artist" | "agency";

export type FanScenarioSlug =
  | "brand_new_fan"
  | "casual_fan"
  | "super_fan"
  | "local_fan"
  | "traveler";

export type ArtistScenarioSlug =
  | "brand_new_artist"
  | "emerging_artist"
  | "growing_artist"
  | "headliner"
  | "comedian"
  | "musician"
  | "dj"
  | "magician"
  | "podcast_host"
  | "motivational_speaker";

export type TestScenarioSlug = FanScenarioSlug | ArtistScenarioSlug;

export const FAN_SCENARIOS: { slug: FanScenarioSlug; label: string; description: string }[] = [
  { slug: "brand_new_fan", label: "Brand New Fan", description: "Just signed up — no follows, empty passport." },
  { slug: "casual_fan", label: "Casual Fan", description: "10 follows, 5 shows, some saved activity." },
  { slug: "super_fan", label: "Super Fan", description: "100 follows, 50 events, VIP, merch, heavy chat." },
  { slug: "local_fan", label: "Local Fan", description: "Home city focus, local badges and community." },
  { slug: "traveler", label: "Traveler", description: "Passport stamps across many cities and tours." },
];

export const ARTIST_SCENARIOS: { slug: ArtistScenarioSlug; label: string; description: string; category?: string }[] = [
  { slug: "brand_new_artist", label: "Brand New Artist", description: "Empty profile, no shows or followers." },
  { slug: "emerging_artist", label: "Emerging Artist", description: "500 followers, 3 shows, 1 upcoming tour." },
  { slug: "growing_artist", label: "Growing Artist", description: "5K followers, tours, merch, VIP tiers." },
  { slug: "headliner", label: "Headliner", description: "100K+ followers, sold-out tours, sponsorships." },
  { slug: "comedian", label: "Comedian", description: "Comedy category with realistic profile.", category: "comedy" },
  { slug: "musician", label: "Musician", description: "Music category artist.", category: "music" },
  { slug: "dj", label: "DJ", description: "DJ / electronic artist.", category: "music" },
  { slug: "magician", label: "Magician", description: "Magic / variety performer.", category: "comedy" },
  { slug: "podcast_host", label: "Podcast Host", description: "Talk / podcast style creator.", category: "comedy" },
  { slug: "motivational_speaker", label: "Motivational Speaker", description: "Speaking / inspiration content.", category: "comedy" },
];

export const BULK_COUNTS = [10, 100, 500, 1000, 10000] as const;

export const PRODUCTION_BULK_CONFIRM_THRESHOLD = 100;

export type AgencyGenerationMode = "repair" | "fresh";

export const AGENCY_GENERATION_MODES: {
  value: AgencyGenerationMode;
  label: string;
  description: string;
}[] = [
  {
    value: "repair",
    label: "Repair Existing Organization",
    description: "Reuse deterministic test accounts when they already exist and repair missing data.",
  },
  {
    value: "fresh",
    label: "Create Fresh Organization",
    description: "Generate unique emails and a new organization every run.",
  },
];

export const IMPERSONATION_COOKIE = "lc_impersonation";
export const ADMIN_SESSION_BACKUP_COOKIE = "lc_admin_session_backup";

export type ImpersonationCookiePayload = {
  auditId: string;
  adminId: string;
  targetId: string;
  displayName: string | null;
  role: string;
  scenario: string | null;
  primaryAgencyId?: string | null;
  agencyMemberRole?: string | null;
};

export type SimulatorAction =
  | "chat_messages"
  | "concurrent_viewers"
  | "ticket_purchases"
  | "follows"
  | "reactions"
  | "livestream_attendance"
  | "passport_completions"
  | "subscriptions"
  | "notifications";

export const SIMULATOR_ACTIONS: { id: SimulatorAction; label: string; defaultCount: number }[] = [
  { id: "chat_messages", label: "Chat messages", defaultCount: 1000 },
  { id: "concurrent_viewers", label: "Concurrent viewers", defaultCount: 500 },
  { id: "ticket_purchases", label: "Ticket purchases", defaultCount: 200 },
  { id: "follows", label: "Follows", defaultCount: 500 },
  { id: "reactions", label: "Reactions", defaultCount: 2000 },
  { id: "livestream_attendance", label: "Livestream attendance", defaultCount: 300 },
  { id: "passport_completions", label: "Passport completions", defaultCount: 50 },
  { id: "subscriptions", label: "VIP subscriptions", defaultCount: 100 },
  { id: "notifications", label: "Notifications", defaultCount: 500 },
];
