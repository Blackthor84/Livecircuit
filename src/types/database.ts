export type UserRole = "fan" | "artist" | "admin" | "super_admin";

export type ArtistCategory =
  | "music"
  | "comedy"
  | "podcast"
  | "author"
  | "gaming"
  | "dj"
  | "theater"
  | "magic"
  | "fitness"
  | "cooking"
  | "education"
  | "religion"
  | "motivational"
  | "other";

export type EventStatus = "draft" | "scheduled" | "live" | "ended" | "cancelled";
export type EventAudienceMode =
  | "worldwide"
  | "us_only"
  | "local_priority"
  | "local_only"
  | "invite_only"
  | "subscribers_only"
  | "vip_only";
export type TourSponsorshipScope = "arena" | "city_stop" | "full_tour";
export type TourStatus = "draft" | "published" | "completed" | "cancelled";

export type Profile = {
  id: string;
  role: UserRole;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country_id: string | null;
  state_id: string | null;
  city_id: string | null;
  onboarding_completed: boolean;
};

export type Artist = {
  id: string;
  user_id: string;
  slug: string;
  stage_name: string;
  banner_url: string | null;
  category: ArtistCategory;
  verified: boolean;
  featured: boolean;
  monthly_listeners: number;
  follower_count: number;
  social_links: Record<string, string>;
  short_bio?: string | null;
  years_performing?: number | null;
  languages?: string[];
  booking_email?: string | null;
  created_at?: string;
};

export type Tour = {
  id: string;
  artist_id: string;
  slug: string;
  title: string;
  description: string | null;
  banner_url: string | null;
  status: TourStatus;
  starts_at: string | null;
  ends_at: string | null;
};

export type TourStop = {
  id: string;
  tour_id: string;
  city_id: string | null;
  venue_id: string | null;
  venue_room_label: string | null;
  virtual_location_label: string;
  stop_order: number;
  scheduled_at: string;
  banner_url: string | null;
  description: string | null;
  capacity: number;
  ticket_price_cents: number;
  vip_price_cents: number | null;
  expected_duration_minutes: number;
  tour_city: string | null;
  tour_state_code: string | null;
  tour_state_name: string | null;
  doors_open_at: string | null;
  show_starts_at: string | null;
  audience_mode: EventAudienceMode;
  local_priority_minutes: number;
  invite_code: string | null;
};

export type Event = {
  id: string;
  tour_stop_id: string;
  artist_id: string;
  venue_id: string | null;
  venue_room_label: string | null;
  slug: string;
  title: string;
  status: EventStatus;
  scheduled_at: string;
  started_at: string | null;
  ended_at: string | null;
  viewer_count: number;
  peak_viewers: number;
  tour_city: string | null;
  tour_state_code: string | null;
  tour_state_name: string | null;
  doors_open_at: string | null;
  show_starts_at: string | null;
  audience_mode: EventAudienceMode;
  local_priority_minutes: number;
  invite_code: string | null;
};

export type StreamProvider = "placeholder" | "agora" | "livekit" | "mux";
export type StreamStatus = "idle" | "starting" | "live" | "ended" | "error";

export type Stream = {
  id: string;
  event_id: string;
  provider: StreamProvider;
  status: StreamStatus;
  external_stream_id: string | null;
  playback_url: string | null;
  ingest_url: string | null;
  stream_key: string | null;
  recording_url: string | null;
  metadata: Record<string, unknown> | null;
};

export type Product = {
  id: string;
  artist_id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_urls: string[];
  is_vip_exclusive: boolean;
  active: boolean;
};

export type FanLocationRow = {
  artist_id: string;
  country_id: string | null;
  state_id: string | null;
  city_id: string | null;
  fan_count: number;
};

export type VenueTypeSlug =
  | "arena"
  | "theater"
  | "comedy-club"
  | "music-hall"
  | "nightclub"
  | "podcast-studio"
  | "lecture-hall"
  | "gaming-arena"
  | "convention-center"
  | "festival-grounds"
  | "outdoor-amphitheater";

export type VenueLoyaltyLevel = "bronze" | "silver" | "gold" | "diamond";

export type SponsorshipProduct =
  | "venue_naming_rights"
  | "digital_billboard"
  | "homepage_banner"
  | "concourse_booth"
  | "pre_show_ad"
  | "vip_lounge"
  | "exclusive_promotion"
  | "merch_sponsorship"
  | "category_sponsorship"
  | "founding_sponsor";

export type VenueSponsorshipStatus = "available" | "pending" | "active" | "expired";

export type Venue = {
  id: string;
  slug: string;
  name: string;
  default_name: string;
  display_name: string;
  sponsored_name: string | null;
  sponsor_company: string | null;
  sponsor_logo_url: string | null;
  sponsor_start_date: string | null;
  sponsor_end_date: string | null;
  sponsorship_status: VenueSponsorshipStatus;
  naming_rights_price: number | null;
  is_placeholder_name: boolean;
  region: string;
  state_code: string | null;
  country_id: string | null;
  state_id: string | null;
  city_id: string | null;
  venue_type_id: string;
  capacity: number;
  soft_capacity_limit: number | null;
  description: string | null;
  banner_url: string | null;
  hero_image_url: string | null;
  theme_palette: Record<string, unknown>;
  popularity_score: number;
  current_visitors: number;
  follower_count: number;
  featured_sponsor_org_id: string | null;
  founding_sponsor_org_id: string | null;
  vr_config: Record<string, unknown>;
  concourse_layout: Record<string, unknown>;
  weather_placeholder: Record<string, unknown>;
  statistics: Record<string, unknown>;
  is_active: boolean;
};

export type SponsorOrganization = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
};

export type VenueSponsorship = {
  id: string;
  venue_id: string;
  organization_id: string;
  product: SponsorshipProduct;
  display_name: string | null;
  is_founding_sponsor: boolean;
  priority_renewal: boolean;
  launch_pricing_cents: number | null;
  contract_starts_at: string;
  contract_ends_at: string | null;
  is_active: boolean;
  history_note: string | null;
};
