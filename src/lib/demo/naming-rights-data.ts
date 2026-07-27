export const DEFAULT_COMPANY = "Granite State Credit Union";
export const DEFAULT_STATE = "New Hampshire";

export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming",
];

/** Section 2 — arena hero stats */
export const ARENA_HERO_STATS = [
  { label: "Current Visitors", value: 14_287, format: "number" as const },
  { label: "Today's Events", value: 84, format: "number" as const },
  { label: "Followers", value: 122_000, format: "compact" as const },
  { label: "Performers", value: 312, format: "number" as const },
  { label: "Sponsor Since", value: 2024, format: "number" as const },
];

/** Section 3 — live arena activity */
export const LIVE_ARENA_STATS = [
  { label: "Current Visitors", value: 14_287, format: "number" as const },
  { label: "Shows Happening", value: 84, format: "number" as const },
  { label: "Stages Active", value: 17, format: "number" as const },
  { label: "Tickets Sold Today", value: 3_482, format: "number" as const },
  { label: "Monthly Reach", value: 1_900_000, format: "compact" as const },
];

export const INSIDE_ARENA_SECTIONS = [
  { name: "Main Stage", icon: "🎤", capacity: "8,200" },
  { name: "Comedy Stage", icon: "😂", capacity: "1,400" },
  { name: "Podcast Theater", icon: "🎙️", capacity: "860" },
  { name: "Food Court", icon: "🍔", capacity: "4,500" },
  { name: "VIP Lounge", icon: "✨", capacity: "320" },
  { name: "Merch Area", icon: "🛍️", capacity: "2,100" },
  { name: "Digital Directory", icon: "📺", capacity: "Always On" },
];

export const EVENT_LISTINGS = [
  { title: "Comedy Night", time: "8:00 PM", viewers: 2_840, category: "Comedy" },
  { title: "Battle of the Bands", time: "9:30 PM", viewers: 4_120, category: "Music" },
  { title: "Music Festival", time: "7:00 PM", viewers: 6_200, category: "Music" },
  { title: "Food Festival", time: "5:00 PM", viewers: 5_400, category: "Food" },
  { title: "Podcast Live", time: "6:00 PM", viewers: 2_890, category: "Podcast" },
  { title: "Magic Showcase", time: "8:30 PM", viewers: 3_720, category: "Magic" },
];

export const FAN_EXPERIENCE_TOUCHPOINTS = [
  { name: "Mobile App", description: "Home screen, push alerts, and live notifications branded for your company." },
  { name: "Website", description: "Arena homepage, event listings, and checkout flows carry your identity." },
  { name: "Arena Directory", description: "Wayfinding kiosks and digital directories across every concourse." },
  { name: "Event Search", description: "Search results and discovery rails highlight your sponsored venue." },
  { name: "Interactive Map", description: "3D venue map with sponsor zones, lounges, and premium placements." },
  { name: "Digital Tickets", description: "Mobile and printable tickets with logo, arena name, and sponsor lockup." },
];

export const INDUSTRIES = [
  "Financial Services",
  "Technology",
  "Healthcare",
  "Retail & Consumer",
  "Automotive",
  "Telecommunications",
  "Energy & Utilities",
  "Insurance",
  "Real Estate",
  "Hospitality",
  "Media & Entertainment",
  "Professional Services",
  "Other",
];

export const NAMING_RIGHTS_BENEFITS = [
  { title: "Permanent Venue Naming", description: "Your company name becomes the official venue identity fans remember and share." },
  { title: "Homepage Placement", description: "Featured hero placement on the arena landing page and LiveCircuit discovery." },
  { title: "Event Branding", description: "Every show, replay, and lineup card credits your brand as presenting sponsor." },
  { title: "Digital Signage", description: "LED boards, concourse screens, and entrance displays across the venue." },
  { title: "Tickets", description: "Digital and printable tickets include your logo and official arena naming." },
  { title: "Streaming Exposure", description: "Lower-thirds, pre-roll, and stage backdrops on every live stream." },
  { title: "Social Media", description: "Co-branded campaigns, highlight clips, and sponsor mentions to fan communities." },
  { title: "VIP Hospitality", description: "Premium lounges, meet-and-greets, and executive hospitality packages." },
  { title: "Executive Networking", description: "Curated introductions with artists, venues, and enterprise partners." },
  { title: "Community Impact", description: "Local activations, charity nights, and regional brand goodwill programs." },
  { title: "Brand Recognition", description: "Always-on impressions across search, discovery, and fan touchpoints." },
];

export const DIGITAL_PLACEMENT_MESSAGES = [
  (company: string, arena: string) => ({ line1: "Now streaming on LiveCircuit", line2: arena, accent: true }),
  (company: string) => ({ line1: "Tonight's Comedy Show", line2: `Presented by ${company}`, accent: false }),
  (company: string) => ({ line1: "Official Arena Partner", line2: company, accent: true }),
  (company: string, arena: string) => ({ line1: "Search · Discover · Watch", line2: `${arena} · ${company}`, accent: false }),
];

/** @deprecated Use DIGITAL_PLACEMENT_MESSAGES */
export const BILLBOARD_MESSAGES = DIGITAL_PLACEMENT_MESSAGES;

import { buildArenaTierOptionsFromPricing } from "@/lib/pricing/founder-sponsor-utils";

export const ARENA_TIER_OPTIONS = buildArenaTierOptionsFromPricing();

export const DASHBOARD_METRICS = [
  { label: "Monthly Visitors", value: 182_000, format: "compact" as const },
  { label: "Brand Impressions", value: 1_800_000, format: "compact" as const },
  { label: "Ticket Sales", value: 24_800, format: "compact" as const },
  { label: "Ad Clicks", value: 48_200, format: "compact" as const },
  { label: "Average Attendance", value: 3_420, format: "number" as const },
  { label: "Live Viewers", value: 14_287, format: "number" as const },
];

export const ANALYTICS_CHART_DATA = {
  monthlyReach: [
    { month: "Jan", value: 120 },
    { month: "Feb", value: 145 },
    { month: "Mar", value: 168 },
    { month: "Apr", value: 182 },
    { month: "May", value: 210 },
    { month: "Jun", value: 235 },
    { month: "Jul", value: 260 },
  ],
  liveViewers: [
    { month: "Jan", value: 8.2 },
    { month: "Feb", value: 9.1 },
    { month: "Mar", value: 10.4 },
    { month: "Apr", value: 11.8 },
    { month: "May", value: 12.4 },
    { month: "Jun", value: 12.9 },
    { month: "Jul", value: 14.3 },
  ],
  ticketSales: [
    { month: "Jan", value: 14 },
    { month: "Feb", value: 17 },
    { month: "Mar", value: 19 },
    { month: "Apr", value: 21 },
    { month: "May", value: 23 },
    { month: "Jun", value: 24 },
    { month: "Jul", value: 25 },
  ],
  adClicks: [
    { month: "Jan", value: 28 },
    { month: "Feb", value: 32 },
    { month: "Mar", value: 36 },
    { month: "Apr", value: 40 },
    { month: "May", value: 44 },
    { month: "Jun", value: 46 },
    { month: "Jul", value: 48 },
  ],
  avgAttendance: [
    { month: "Jan", value: 2.4 },
    { month: "Feb", value: 2.7 },
    { month: "Mar", value: 2.9 },
    { month: "Apr", value: 3.1 },
    { month: "May", value: 3.2 },
    { month: "Jun", value: 3.3 },
    { month: "Jul", value: 3.4 },
  ],
  brandImpressions: [
    { month: "Jan", value: 1.2 },
    { month: "Feb", value: 1.4 },
    { month: "Mar", value: 1.5 },
    { month: "Apr", value: 1.6 },
    { month: "May", value: 1.7 },
    { month: "Jun", value: 1.75 },
    { month: "Jul", value: 1.8 },
  ],
};

export const PROPOSAL_BENEFITS = [
  "Permanent arena naming rights",
  "Logo on every digital ticket & event page",
  "Livestream overlay & stage LED placements",
  "Virtual VIP lounge co-branding",
  "Monthly analytics dashboard",
  "Push, email & profile frame campaigns",
  "Search & discovery priority",
  "Dedicated account manager",
];

export const WHY_LIVECIRCUIT = [
  { title: "Brand Awareness", description: "Your name on a permanent virtual venue seen by millions of fans worldwide." },
  { title: "Digital Exposure", description: "Livestream overlays, event listings, and in-app placements across every fan touchpoint." },
  { title: "Every Ticket Includes Sponsor", description: "Digital and printable tickets carry your logo and arena name." },
  { title: "Every Event Displays Sponsor", description: "Lineup cards, replays, and event pages credit your brand." },
  { title: "Sponsor Homepage", description: "Featured placement on the arena landing page fans bookmark." },
  { title: "Search Visibility", description: "Fans discover your arena when searching cities, genres, and artists." },
  { title: "Live Event Branding", description: "Lower-thirds, overlays, and stage LED content during every stream." },
  { title: "Arena Naming Rights", description: "Official venue name — the address fans share and remember." },
  { title: "VIP Events", description: "Exclusive virtual VIP lounges, meet-and-greets, and hospitality packages." },
  { title: "Business Networking", description: "Connect with performers, venues, and enterprise partners on LiveCircuit." },
];

export const BRANDING_MOCKUP_TYPES = [
  "Arena Entrance",
  "Arena Homepage",
  "Event Listing",
  "Digital Tickets",
  "Mobile App",
  "Livestream Overlay",
  "Stage LED Screens",
  "Virtual Lobby",
  "VIP Lounge",
  "Chat Branding",
  "Push Notifications",
  "Email Campaigns",
  "Digital Merchandise",
  "Profile Frames",
  "Search Results",
  "Analytics Dashboard",
] as const;
