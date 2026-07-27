/** Digital sponsorship placements across the complete fan journey (demo). */

export type DigitalPlacementId =
  | "arena-entrance"
  | "arena-homepage"
  | "event-listing"
  | "digital-tickets"
  | "mobile-app"
  | "livestream-overlay"
  | "stage-led"
  | "virtual-lobby"
  | "vip-lounge"
  | "chat-branding"
  | "push-notifications"
  | "email-campaigns"
  | "digital-merchandise"
  | "profile-frames"
  | "search-results"
  | "analytics-dashboard";

export type JourneyPhase = "discover" | "purchase" | "live" | "engage" | "retain" | "measure";

export const DIGITAL_SPONSORSHIP_PLACEMENTS: {
  id: DigitalPlacementId;
  label: string;
  channel: string;
  phase: JourneyPhase;
  icon: string;
  description: string;
}[] = [
  {
    id: "search-results",
    label: "Search Results",
    channel: "Discovery",
    phase: "discover",
    icon: "🔍",
    description: "Sponsored arena appears when fans search artists, cities, and genres.",
  },
  {
    id: "arena-entrance",
    label: "Arena Entrance",
    channel: "Discovery",
    phase: "discover",
    icon: "🚪",
    description: "Branded welcome screen when a fan first arrives at your venue.",
  },
  {
    id: "arena-homepage",
    label: "Arena Homepage",
    channel: "Venue",
    phase: "discover",
    icon: "🏠",
    description: "Hero banner, logo, and presenting sponsor credit on the arena landing page.",
  },
  {
    id: "event-listing",
    label: "Event Listing",
    channel: "Events",
    phase: "discover",
    icon: "📅",
    description: "Every show card displays “Presented by [Sponsor]” across discovery feeds.",
  },
  {
    id: "digital-tickets",
    label: "Digital Tickets",
    channel: "Commerce",
    phase: "purchase",
    icon: "🎫",
    description: "Sponsor logo on checkout, confirmation, and wallet passes.",
  },
  {
    id: "mobile-app",
    label: "Mobile App",
    channel: "Mobile",
    phase: "purchase",
    icon: "📱",
    description: "In-app banners, arena tabs, and push opt-in surfaces.",
  },
  {
    id: "virtual-lobby",
    label: "Virtual Lobby",
    channel: "Pre-Show",
    phase: "live",
    icon: "✨",
    description: "Pre-show waiting room with sponsor content, countdown, and fan chat.",
  },
  {
    id: "livestream-overlay",
    label: "Livestream Overlay",
    channel: "Live",
    phase: "live",
    icon: "📺",
    description: "Lower-thirds, corner bugs, and presenter credits during every stream.",
  },
  {
    id: "stage-led",
    label: "Stage LED Screens",
    channel: "Live",
    phase: "live",
    icon: "🎬",
    description: "Full-width digital stage backdrops and LED content between sets.",
  },
  {
    id: "chat-branding",
    label: "Chat Branding",
    channel: "Live",
    phase: "live",
    icon: "💬",
    description: "Sponsor badges in live chat, emotes, and moderated fan messages.",
  },
  {
    id: "vip-lounge",
    label: "VIP Lounge",
    channel: "Premium",
    phase: "live",
    icon: "👑",
    description: "Co-branded VIP room with exclusive streams and sponsor hospitality.",
  },
  {
    id: "digital-merchandise",
    label: "Digital Merchandise",
    channel: "Commerce",
    phase: "engage",
    icon: "🛍️",
    description: "Sponsor co-branded merch drops and limited digital collectibles.",
  },
  {
    id: "profile-frames",
    label: "Profile Frames",
    channel: "Social",
    phase: "engage",
    icon: "🖼️",
    description: "Fans show sponsor-branded frames after attending a show.",
  },
  {
    id: "push-notifications",
    label: "Push Notifications",
    channel: "Mobile",
    phase: "retain",
    icon: "🔔",
    description: "Event reminders and replays delivered with sponsor attribution.",
  },
  {
    id: "email-campaigns",
    label: "Email Campaigns",
    channel: "Email",
    phase: "retain",
    icon: "✉️",
    description: "Ticket confirmations, newsletters, and post-show follow-ups.",
  },
  {
    id: "analytics-dashboard",
    label: "Analytics Dashboard",
    channel: "Insights",
    phase: "measure",
    icon: "📊",
    description: "Executive dashboard showing impressions, clicks, and ROI by placement.",
  },
];

export const DIGITAL_PLACEMENT_LABELS = DIGITAL_SPONSORSHIP_PLACEMENTS.map((p) => p.label);

export const JOURNEY_PHASE_LABELS: Record<JourneyPhase, string> = {
  discover: "Discover",
  purchase: "Purchase",
  live: "Watch Live",
  engage: "Engage",
  retain: "Return",
  measure: "Measure",
};
