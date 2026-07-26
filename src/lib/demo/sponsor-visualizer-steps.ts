export const SPONSOR_VISUALIZER_STEPS = [
  { id: 1, title: "Choose State", short: "State" },
  { id: 2, title: "Choose Venue", short: "Venue" },
  { id: 3, title: "Company", short: "Company" },
  { id: 4, title: "Live Venue Preview", short: "Preview" },
  { id: 5, title: "Arena Walkthrough", short: "Walk" },
  { id: 6, title: "Live Event Branding", short: "Events" },
  { id: 7, title: "Business Dashboard", short: "Dashboard" },
  { id: 8, title: "Fan Journey", short: "Journey" },
  { id: 9, title: "Digital Presence", short: "Digital" },
  { id: 10, title: "ROI Calculator", short: "ROI" },
  { id: 11, title: "Proposal", short: "Proposal" },
  { id: 12, title: "Presentation & Flyover", short: "Present" },
  { id: 13, title: "Exports", short: "Export" },
  { id: 14, title: "Closing", short: "Close" },
] as const;

export const PRESENTATION_SLIDE_IDS = [4, 5, 6, 7, 8, 9, 10, 11] as const;

export const FLYOVER_SCENE_IDS = [
  "drone-approach",
  "entrance-lights",
  "sponsor-logo",
  "fans-enter",
  "concert",
  "billboards",
  "food-court",
  "comedy",
  "podcast",
  "vip",
  "mobile-app",
  "analytics",
  "proposal",
  "closing",
] as const;

export type FlyoverSceneId = (typeof FLYOVER_SCENE_IDS)[number];

export type SponsorVisualizerStepId = (typeof SPONSOR_VISUALIZER_STEPS)[number]["id"];

export type ConfiguratorPhase = "intro" | "configurator";

export const EVENT_TYPES = [
  { id: "music", label: "Music Festival", emoji: "🎵", vibe: "Stage lighting & festival energy", accent: "concert" },
  { id: "comedy", label: "Comedy Show", emoji: "😂", vibe: "Spotlight stage & intimate room", accent: "spotlight" },
  { id: "podcast", label: "Podcast", emoji: "🎙️", vibe: "Studio warmth & broadcast booth", accent: "studio" },
  { id: "food", label: "Food Festival", emoji: "🍔", vibe: "Market stalls & open-air dining", accent: "market" },
  { id: "conference", label: "Conference", emoji: "💼", vibe: "Corporate branding & networking", accent: "corporate" },
  { id: "magic", label: "Magic Show", emoji: "🎩", vibe: "Theater mystique & dramatic lighting", accent: "theater" },
  { id: "esports", label: "Esports", emoji: "🎮", vibe: "Gaming screens & competitive arena", accent: "gaming" },
] as const;

export type EventTypeId = (typeof EVENT_TYPES)[number]["id"];

export const ATTENDANCE_OPTIONS = [500, 2_500, 5_000, 10_000, 25_000, 50_000] as const;

export const WALKTHROUGH_SCENES = [
  { id: "outside", name: "Outside", icon: "🏛️", description: "Aerial approach, plaza, and arrival experience." },
  { id: "entrance", name: "Entrance", icon: "🚪", description: "Glass doors, LED marquee, and sponsor welcome." },
  { id: "lobby", name: "Lobby", icon: "✨", description: "Digital directory and brand wall." },
  { id: "hallway", name: "Hallway", icon: "🛤️", description: "Wayfinding, banners, and concourse signage." },
  { id: "food", name: "Food Court", icon: "🍔", description: "Concession branding and activations." },
  { id: "vip", name: "VIP Lounge", icon: "🥂", description: "Premium hospitality and co-branded fixtures." },
  { id: "main-stage", name: "Main Stage", icon: "🎤", description: "Headline performances under your arch." },
  { id: "comedy", name: "Comedy Room", icon: "😂", description: "Intimate room with sponsor intro cards." },
  { id: "podcast", name: "Podcast Studio", icon: "🎙️", description: "Broadcast booth and live audience." },
  { id: "parking", name: "Parking Lot", icon: "🅿️", description: "Directional signs and arrival flow." },
  { id: "exit", name: "Exit", icon: "👋", description: "Departure screens and return prompts." },
] as const;

export const DIGITAL_PRESENCE_MOCKUPS = [
  { id: "homepage", label: "Homepage", channel: "LiveCircuit" },
  { id: "listing", label: "Arena Listing", channel: "Discovery" },
  { id: "search", label: "Search Results", channel: "Search" },
  { id: "events", label: "Event Listings", channel: "Events" },
  { id: "tickets", label: "Tickets", channel: "Commerce" },
  { id: "email", label: "Emails", channel: "Email" },
  { id: "push", label: "Push Notifications", channel: "Mobile" },
  { id: "instagram", label: "Instagram", channel: "Social" },
  { id: "tiktok", label: "TikTok", channel: "Social" },
  { id: "facebook", label: "Facebook", channel: "Social" },
  { id: "linkedin", label: "LinkedIn", channel: "Social" },
] as const;

export const LIVE_PERSONALIZATION_ITEMS = [
  "Arena Name",
  "Entrance Sign",
  "Scoreboard",
  "Website",
  "Mobile App",
  "Digital Tickets",
  "VIP Passes",
  "Billboards",
  "Parking Signs",
  "Street Banners",
  "Employee Shirts",
  "Event Posters",
  "Proposal",
  "Analytics",
] as const;

export const STATE_ECONOMIC_REGIONS: Record<string, string> = {
  Alabama: "Southeast", Alaska: "Pacific", Arizona: "Southwest", Arkansas: "Southeast",
  California: "Pacific", Colorado: "Mountain", Connecticut: "Northeast", Delaware: "Mid-Atlantic",
  Florida: "Southeast", Georgia: "Southeast", Hawaii: "Pacific", Idaho: "Mountain",
  Illinois: "Midwest", Indiana: "Midwest", Iowa: "Midwest", Kansas: "Midwest",
  Kentucky: "Southeast", Louisiana: "Southeast", Maine: "Northeast", Maryland: "Mid-Atlantic",
  Massachusetts: "Northeast", Michigan: "Midwest", Minnesota: "Midwest", Mississippi: "Southeast",
  Missouri: "Midwest", Montana: "Mountain", Nebraska: "Midwest", Nevada: "West",
  "New Hampshire": "Northeast", "New Jersey": "Mid-Atlantic", "New Mexico": "Southwest",
  "New York": "Northeast", "North Carolina": "Southeast", "North Dakota": "Midwest",
  Ohio: "Midwest", Oklahoma: "Southwest", Oregon: "Pacific", Pennsylvania: "Mid-Atlantic",
  "Rhode Island": "Northeast", "South Carolina": "Southeast", "South Dakota": "Midwest",
  Tennessee: "Southeast", Texas: "Southwest", Utah: "Mountain", Vermont: "Northeast",
  Virginia: "Mid-Atlantic", Washington: "Pacific", "West Virginia": "Southeast",
  Wisconsin: "Midwest", Wyoming: "Mountain",
};

export const FAN_JOURNEY_STEPS = [
  { label: "Google Search", icon: "search" as const },
  { label: "Clicks LiveCircuit", icon: "click" as const },
  { label: "Visits Arena", icon: "venue" as const },
  { label: "Buys Ticket", icon: "ticket" as const },
  { label: "Enters Venue", icon: "enter" as const },
  { label: "Sees Sponsor", icon: "sponsor" as const },
  { label: "Attends Event", icon: "event" as const },
  { label: "Shares on Social", icon: "social" as const },
  { label: "Returns Again", icon: "return" as const },
] as const;

export const SPONSOR_MOCKUP_TYPES = [
  "Arena Entrance", "VIP Badge", "Staff Shirts", "Tickets", "Digital Screens",
  "Website", "Mobile App", "Homepage", "Billboards", "Parking Sign", "Street Banner",
] as const;

export const STATE_MAP_POSITIONS: Record<string, { x: number; y: number; abbr: string }> = {
  Alabama: { x: 72, y: 68, abbr: "AL" }, Alaska: { x: 12, y: 82, abbr: "AK" },
  Arizona: { x: 22, y: 58, abbr: "AZ" }, Arkansas: { x: 62, y: 62, abbr: "AR" },
  California: { x: 8, y: 48, abbr: "CA" }, Colorado: { x: 38, y: 46, abbr: "CO" },
  Connecticut: { x: 88, y: 32, abbr: "CT" }, Delaware: { x: 86, y: 40, abbr: "DE" },
  Florida: { x: 78, y: 78, abbr: "FL" }, Georgia: { x: 74, y: 64, abbr: "GA" },
  Hawaii: { x: 28, y: 82, abbr: "HI" }, Idaho: { x: 22, y: 28, abbr: "ID" },
  Illinois: { x: 68, y: 44, abbr: "IL" }, Indiana: { x: 72, y: 42, abbr: "IN" },
  Iowa: { x: 58, y: 38, abbr: "IA" }, Kansas: { x: 52, y: 50, abbr: "KS" },
  Kentucky: { x: 72, y: 50, abbr: "KY" }, Louisiana: { x: 62, y: 72, abbr: "LA" },
  Maine: { x: 92, y: 22, abbr: "ME" }, Maryland: { x: 84, y: 42, abbr: "MD" },
  Massachusetts: { x: 90, y: 30, abbr: "MA" }, Michigan: { x: 72, y: 32, abbr: "MI" },
  Minnesota: { x: 56, y: 24, abbr: "MN" }, Mississippi: { x: 66, y: 68, abbr: "MS" },
  Missouri: { x: 60, y: 50, abbr: "MO" }, Montana: { x: 32, y: 22, abbr: "MT" },
  Nebraska: { x: 48, y: 40, abbr: "NE" }, Nevada: { x: 16, y: 42, abbr: "NV" },
  "New Hampshire": { x: 90, y: 26, abbr: "NH" }, "New Jersey": { x: 86, y: 36, abbr: "NJ" },
  "New Mexico": { x: 34, y: 58, abbr: "NM" }, "New York": { x: 84, y: 30, abbr: "NY" },
  "North Carolina": { x: 80, y: 56, abbr: "NC" }, "North Dakota": { x: 48, y: 20, abbr: "ND" },
  Ohio: { x: 76, y: 40, abbr: "OH" }, Oklahoma: { x: 52, y: 58, abbr: "OK" },
  Oregon: { x: 10, y: 26, abbr: "OR" }, Pennsylvania: { x: 82, y: 38, abbr: "PA" },
  "Rhode Island": { x: 91, y: 32, abbr: "RI" }, "South Carolina": { x: 78, y: 60, abbr: "SC" },
  "South Dakota": { x: 48, y: 30, abbr: "SD" }, Tennessee: { x: 70, y: 56, abbr: "TN" },
  Texas: { x: 48, y: 68, abbr: "TX" }, Utah: { x: 28, y: 44, abbr: "UT" },
  Vermont: { x: 88, y: 24, abbr: "VT" }, Virginia: { x: 80, y: 48, abbr: "VA" },
  Washington: { x: 12, y: 18, abbr: "WA" }, "West Virginia": { x: 78, y: 46, abbr: "WV" },
  Wisconsin: { x: 64, y: 28, abbr: "WI" }, Wyoming: { x: 36, y: 34, abbr: "WY" },
};
