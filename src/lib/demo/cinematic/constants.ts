export type CameraAngle = "default" | "vip" | "back" | "stage-left" | "stage-right";
export type LightingPreset = "default" | "purple" | "cyan" | "gold" | "red" | "strobe";

export type DemoAudience = "fan" | "artist" | "agency";

export const DEMO_META = {
  fan: {
    title: "Experience LiveCircuit",
    subtitle: "Attend the future of live entertainment",
    entryCta: "ENTER ARENA",
    connectMessage: "Connecting to Arena...",
  },
  artist: {
    title: "Perform on LiveCircuit",
    subtitle: "Command the stage. Own the crowd.",
    entryCta: "TAKE THE STAGE",
    connectMessage: "Backstage access granted...",
  },
  agency: {
    title: "Manage Artists with LiveCircuit",
    subtitle: "Mission control for your entire roster",
    entryCta: "OPEN MISSION CONTROL",
    connectMessage: "Initializing roster systems...",
  },
} as const;

export const ARENA_VENUES = [
  { id: "boston", name: "Boston Harbor Arena", city: "Boston", lighting: "purple" as LightingPreset, accent: "from-violet-600 to-purple-700" },
  { id: "chicago", name: "Windy City Stadium", city: "Chicago", lighting: "cyan" as LightingPreset, accent: "from-cyan-600 to-blue-700" },
  { id: "miami", name: "Miami Pulse Arena", city: "Miami", lighting: "gold" as LightingPreset, accent: "from-amber-500 to-orange-600" },
  { id: "seattle", name: "Pacific Sound Hall", city: "Seattle", lighting: "default" as LightingPreset, accent: "from-indigo-600 to-violet-700" },
] as const;

export const FAN_CHAT_MESSAGES = [
  { user: "alex_bos", message: "THIS IS THE FUTURE", emoji: "🔥" },
  { user: "neon_fan", message: "Arena visuals are insane", emoji: "✨" },
  { user: "vip_luna", message: "Front row hits different", emoji: "💜" },
  { user: "circuit_47", message: "Best show I've ever seen", emoji: "❤️" },
  { user: "glow_kid", message: "ENCORE!!!", emoji: "👏" },
  { user: "tip_master", message: "Just sent a tip", emoji: "💸" },
  { user: "merch_queen", message: "Copped the tour tee", emoji: "👕" },
];

export const FAN_MERCH = [
  { id: "tee", name: "Tour T-Shirt", price: 35 },
  { id: "hoodie", name: "Glow Hoodie", price: 65 },
  { id: "vinyl", name: "Limited Vinyl", price: 45 },
];

export const TOUR_MAP_NODES = [
  { id: "boston", city: "Boston", x: 88, y: 28, capacity: 10000, attendance: 9200, revenue: 506000 },
  { id: "chicago", city: "Chicago", x: 58, y: 32, capacity: 14000, attendance: 11800, revenue: 767000 },
  { id: "dallas", city: "Dallas", x: 42, y: 62, capacity: 12000, attendance: 10500, revenue: 577500 },
  { id: "seattle", city: "Seattle", x: 12, y: 14, capacity: 9500, attendance: 8900, revenue: 489500 },
  { id: "austin", city: "Austin", x: 38, y: 72, capacity: 8500, attendance: 7200, revenue: 396000 },
  { id: "miami", city: "Miami", x: 78, y: 78, capacity: 11000, attendance: 9800, revenue: 539000 },
  { id: "denver", city: "Denver", x: 32, y: 38, capacity: 9000, attendance: 8100, revenue: 445500 },
  { id: "atlanta", city: "Atlanta", x: 68, y: 58, capacity: 10500, attendance: 9400, revenue: 517000 },
] as const;

export const AGENCY_ROSTER = [
  { id: "artist-1", name: "Nova Ray", avatar: "NR", genre: "Electronic", show: "Boston Harbor Arena", manager: "Sarah Chen", liveAudience: 12400, revenue: 18430, followers: 92114, shows: 3, merch: 4820, status: "LIVE" as const, color: "from-violet-500 to-purple-600", growth: 18.4 },
  { id: "a3", name: "DJ Prism", avatar: "DP", genre: "EDM", show: "Miami Pulse Arena", manager: "Marcus Lee", liveAudience: 18200, revenue: 42100, followers: 412000, shows: 18, merch: 12400, status: "LIVE" as const, color: "from-cyan-500 to-blue-600", growth: 24.1 },
  { id: "a2", name: "Midnight Echo", avatar: "ME", genre: "Indie", show: "Chicago Stadium", manager: "Sarah Chen", liveAudience: 6800, revenue: 9200, followers: 192000, shows: 8, merch: 3100, status: "ON TOUR" as const, color: "from-emerald-500 to-teal-600", growth: 12.8 },
  { id: "a4", name: "Luna Vale", avatar: "LV", genre: "R&B", show: "Rehearsal Block", manager: "James Park", liveAudience: 5400, revenue: 7800, followers: 156800, shows: 6, merch: 2200, status: "REHEARSAL" as const, color: "from-rose-500 to-pink-600", growth: 9.2 },
  { id: "a5", name: "Kai Rivers", avatar: "KR", genre: "Hip-Hop", show: "Atlanta Arena", manager: "Marcus Lee", liveAudience: 9100, revenue: 15600, followers: 278000, shows: 14, merch: 5600, status: "LIVE" as const, color: "from-amber-500 to-orange-600", growth: 21.6 },
  { id: "a6", name: "Aurora Pulse", avatar: "AP", genre: "Synth", show: "—", manager: "Unassigned", liveAudience: 0, revenue: 4100, followers: 98400, shows: 5, merch: 1800, status: "IDLE" as const, color: "from-indigo-500 to-violet-600", growth: 15.3 },
];

export const AGENCY_NOTIFICATIONS = [
  { id: "n1", type: "contract", text: "Nova Ray — Boston contract renews in 14 days", time: "2m ago" },
  { id: "n2", type: "live", text: "DJ Prism crossed $40K revenue tonight", time: "8m ago" },
  { id: "n3", type: "tour", text: "Midnight Echo added Dallas to tour route", time: "22m ago" },
  { id: "n4", type: "alert", text: "Kai Rivers VIP lounge at 94% capacity", time: "35m ago" },
];

export const ARTIST_LIVE_STATS = {
  audience: 12400,
  tips: 2840,
  followersGained: 892,
  merchSales: 4820,
  vipMembers: 847,
  capacity: 14000,
  revenueTonight: 18430,
  encoreRequests: 2340,
};

export const ARTIST_CHAT = [
  { user: "superfan_99", message: "YOU'RE KILLING IT" },
  { user: "vip_room", message: "VIP lounge is packed" },
  { user: "request_bot", message: "Song request: Neon Dreams" },
];

export const PUBLISH_STEPS = [
  "Creating Arenas...",
  "Scheduling Shows...",
  "Sending Notifications...",
  "Publishing...",
];

export const REACTION_EMOJIS = ["🔥", "❤️", "🎉", "👏", "🤘", "✨", "💜", "🎸"];
