export type AgencyPlan = "starter" | "pro" | "enterprise";

export type AgencyMemberRole =
  | "owner"
  | "admin"
  | "booking_manager"
  | "artist_manager"
  | "assistant"
  | "marketing"
  | "finance"
  | "read_only";

export type AgencyArtistStatus = "pending" | "active" | "suspended" | "ended";

export type AgencyBookingStatus =
  | "draft"
  | "pending"
  | "matched"
  | "approved"
  | "rejected"
  | "cancelled";

export type AgencyOrgAccessDeniedCode =
  | "not_configured"
  | "no_membership"
  | "organization_not_found"
  | "permissions_missing"
  | "subscription_missing";

export type AgencyOrgAccessResult =
  | { ok: true; organization: Record<string, unknown>; role: AgencyMemberRole }
  | { ok: false; code: AgencyOrgAccessDeniedCode; message: string };

export type AgencyPermissions = {
  manage_roster?: boolean;
  book_events?: boolean;
  view_revenue?: boolean;
  manage_team?: boolean;
  manage_sponsorship?: boolean;
  export_data?: boolean;
};

export type AgencyDashboardNavigationItem = {
  id: string;
  label: string;
  href: string;
};

export type AgencyDashboardConfiguration = {
  dashboard_settings: {
    widgets: string[];
    layout: string;
    navigation: AgencyDashboardNavigationItem[];
    preferences: {
      compact_mode: boolean;
      default_date_range: string;
      show_revenue: boolean;
    };
  };
  settings: {
    timezone: string;
    notifications_enabled: boolean;
    booking_auto_match: boolean;
  };
  analytics: {
    enabled: boolean;
    default_range: string;
    modules: string[];
  };
  feature_flags: {
    bulk_booking: boolean;
    sponsorship: boolean;
    team_management: boolean;
    advanced_analytics: boolean;
    calendar_sync: boolean;
  };
};

export type AgencyOrgSummary = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  plan: AgencyPlan;
  verified: boolean;
  role: AgencyMemberRole;
};

export type AgencyManagedArtist = {
  id: string;
  organization_id: string;
  artist_id: string;
  status: AgencyArtistStatus;
  assigned_manager_id: string | null;
  assigned_assistant_id: string | null;
  genres: string[];
  tags: string[];
  notes: string | null;
  biography: string | null;
  created_at: string;
  artists: {
    id: string;
    slug: string;
    stage_name: string;
    banner_url: string | null;
    verified: boolean;
    follower_count: number;
    category: string;
  } | null;
};

export type AgencyMember = {
  id: string;
  user_id: string;
  role: AgencyMemberRole;
  profiles: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

export type AgencyBookingMatch = {
  id: string;
  artist_id: string;
  venue_id: string | null;
  match_score: number;
  status: string;
  recommendation: {
    venueName?: string;
    venueSlug?: string;
    artistName?: string;
    artistSlug?: string;
    reasons?: string[];
    estimatedRevenueCents?: number;
    genreFit?: number;
    audienceOverlap?: number;
  };
  artists?: { slug: string; stage_name: string } | null;
};

export type AgencyDashboardStats = {
  totalArtists: number;
  activeArtists: number;
  upcomingPerformances: number;
  ticketsSold: number;
  grossRevenueCents: number;
  pendingBookingRequests: number;
  upcomingSponsorships: number;
  newFollowers: number;
  monthlyRevenueCents: number;
  trendingArtists: { slug: string; stage_name: string; follower_count: number }[];
  revenueByArtist: { name: string; cents: number }[];
  revenueByGenre: { genre: string; cents: number }[];
  revenueTrend: { month: string; cents: number }[];
  ticketsTrend: { month: string; count: number }[];
  attendanceTrend: { month: string; viewers: number }[];
  geoAudience: { region: string; count: number }[];
};

export type AgencyPublicProfile = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  banner_url: string | null;
  biography: string | null;
  verified: boolean;
  genres: string[];
  years_in_business: number | null;
  roster_count: number;
  website_url: string | null;
  social_links: Record<string, string>;
};
