import type {
  DemoArtist,
  DemoEvent,
  DemoFeedItem,
  DemoShow,
  DemoSponsorArena,
  DemoStateArena,
} from "@/lib/demo/interactive/types";

export const DEMO_ARTIST: DemoArtist = {
  id: "artist-1",
  name: "Nova Ray",
  slug: "nova-ray",
  genre: "Electronic / Pop",
  avatar: "NR",
  followers: 92_114,
  verified: true,
  revenue: 18_430,
  upcomingShows: 3,
  statesReached: 24,
};

export const DEMO_ARTIST_DASHBOARD = {
  monthlyListeners: 1_284_000,
  merchSales: 4_820,
  messages: [
    { id: "m1", from: "Sarah K.", preview: "Can't wait for Boston! Any meet & greet?", time: "2m ago", unread: true },
    { id: "m2", from: "Venue Ops", preview: "Chicago arena confirmed — load-in 4pm", time: "18m ago" },
    { id: "m3", from: "Agency Rep", preview: "Sponsor deck approved for Dallas", time: "1h ago" },
  ],
  notifications: [
    { id: "n1", title: "47 tickets sold — Boston", time: "Just now", type: "sale" as const },
    { id: "n2", title: "892 new followers today", time: "12m ago", type: "fan" as const },
    { id: "n3", title: "Chicago booking confirmed", time: "1h ago", type: "booking" as const },
  ],
};

export const TOUR_PUBLISH_CITIES = ["Boston", "Chicago", "Dallas", "Seattle"];

export const TOUR_SALE_SEQUENCE = {
  fanIncrements: [1, 4, 13, 27, 48, 92, 140],
  revenueSteps: [25, 300, 1200, 6800, 14900, 18430],
};

export const DEMO_CITIES = [
  "Boston", "Chicago", "Dallas", "Seattle", "Austin", "Nashville", "Denver", "Miami", "Atlanta", "Los Angeles",
];

export const MERCH_OPTIONS = [
  "Tour T-Shirt ($35)",
  "Signed Poster ($25)",
  "VIP Bundle ($89)",
  "Limited Vinyl ($45)",
  "Glow Wristband ($15)",
];

export const DEMO_AGENCY_STATS = {
  totalArtists: 117,
  upcomingPerformances: 489,
  revenue: 8_400_000,
  ticketSales: 1_240_000,
  attendance: 3_800_000,
  fanGrowth: 18,
  merchRevenue: 890_000,
  sponsorRevenue: 2_100_000,
  activeContracts: 132,
  upcomingTours: 132,
  showsThisMonth: 489,
};

export const DEMO_AGENCY_ARTISTS: DemoArtist[] = [
  DEMO_ARTIST,
  { id: "a2", name: "The Midnight Echo", slug: "midnight-echo", genre: "Indie Rock", avatar: "ME", followers: 192_000, verified: true, revenue: 890_400, upcomingShows: 8, statesReached: 28 },
  { id: "a3", name: "DJ Prism", slug: "dj-prism", genre: "House / EDM", avatar: "DP", followers: 412_000, verified: true, revenue: 2_100_000, upcomingShows: 18, statesReached: 44 },
  { id: "a4", name: "Luna Vale", slug: "luna-vale", genre: "R&B / Soul", avatar: "LV", followers: 156_800, verified: false, revenue: 620_000, upcomingShows: 6, statesReached: 22 },
  { id: "a5", name: "Kai Rivers", slug: "kai-rivers", genre: "Hip-Hop", avatar: "KR", followers: 278_000, verified: true, revenue: 1_450_000, upcomingShows: 14, statesReached: 32 },
  { id: "a6", name: "Aurora Pulse", slug: "aurora-pulse", genre: "Synthwave", avatar: "AP", followers: 98_400, verified: true, revenue: 540_000, upcomingShows: 5, statesReached: 18 },
];

export const DEMO_ARTIST_PROFILES: Record<string, {
  contracts: { id: string; venue: string; date: string; fee: number; status: string }[];
  bookings: { id: string; city: string; date: string; status: string }[];
  sponsorDeals: { id: string; brand: string; value: number; expires: string }[];
  demographics: { label: string; pct: number }[];
  audienceGrowth: { month: string; followers: number }[];
  revenueHistory: { month: string; revenue: number }[];
  upcomingTours: { city: string; date: string; venue: string }[];
}> = {
  "artist-1": {
    contracts: [
      { id: "c1", venue: "Harbor Lights Arena", date: "Sep 12", fee: 85000, status: "Signed" },
      { id: "c2", venue: "Windy City Stadium", date: "Sep 19", fee: 120000, status: "Signed" },
      { id: "c3", venue: "Lone Star Arena", date: "Sep 26", fee: 95000, status: "Pending" },
    ],
    bookings: [
      { id: "b1", city: "Boston", date: "Sep 12", status: "Confirmed" },
      { id: "b2", city: "Chicago", date: "Sep 19", status: "Confirmed" },
      { id: "b3", city: "Dallas", date: "Sep 26", status: "Hold" },
      { id: "b4", city: "Seattle", date: "Oct 3", status: "Negotiating" },
    ],
    sponsorDeals: [
      { id: "s1", brand: "TechCorp", value: 250000, expires: "Dec 2026" },
      { id: "s2", brand: "StreamMax", value: 180000, expires: "Mar 2027" },
    ],
    demographics: [
      { label: "18–24", pct: 32 }, { label: "25–34", pct: 41 }, { label: "35–44", pct: 18 }, { label: "45+", pct: 9 },
    ],
    audienceGrowth: [
      { month: "Feb", followers: 72000 }, { month: "Mar", followers: 78000 }, { month: "Apr", followers: 82000 },
      { month: "May", followers: 86000 }, { month: "Jun", followers: 89000 }, { month: "Jul", followers: 92114 },
    ],
    revenueHistory: [
      { month: "Feb", revenue: 8200 }, { month: "Mar", revenue: 11400 }, { month: "Apr", revenue: 9800 },
      { month: "May", revenue: 14200 }, { month: "Jun", revenue: 16800 }, { month: "Jul", revenue: 18430 },
    ],
    upcomingTours: [
      { city: "Boston", date: "Sep 12", venue: "Harbor Lights Arena" },
      { city: "Chicago", date: "Sep 19", venue: "Windy City Stadium" },
      { city: "Dallas", date: "Sep 26", venue: "Lone Star Arena" },
      { city: "Seattle", date: "Oct 3", venue: "Pacific Sound Arena" },
    ],
  },
};

export const DEMO_SHOWS: DemoShow[] = [
  { id: "s1", title: "Neon Dreams — Boston", arena: "Harbor Lights Arena", tier: "arena", state: "MA", city: "Boston", date: "2026-09-12", time: "8:00 PM", ticketPrice: 55, vipPrice: 149, capacity: 10000, sold: 6200, revenue: 341_000, status: "upcoming" },
  { id: "s2", title: "Neon Dreams — Chicago", arena: "Windy City Stadium", tier: "stadium", state: "IL", city: "Chicago", date: "2026-09-19", time: "7:30 PM", ticketPrice: 65, vipPrice: 175, capacity: 14000, sold: 4800, revenue: 312_000, status: "upcoming" },
  { id: "s3", title: "Neon Dreams — Dallas", arena: "Lone Star Arena", tier: "arena", state: "TX", city: "Dallas", date: "2026-09-26", time: "8:00 PM", ticketPrice: 55, vipPrice: 149, capacity: 12000, sold: 3100, revenue: 170_500, status: "upcoming" },
];

export const DEMO_EVENTS: DemoEvent[] = [
  { id: "e1", artist: "Nova Ray", artistAvatar: "NR", title: "Neon Dreams Live", arena: "Austin Theater Arena", state: "TX", date: "Aug 15", ticketPrice: 45, vipPrice: 125, soldPercent: 85, genre: "Electronic" },
  { id: "e2", artist: "The Midnight Echo", artistAvatar: "ME", title: "Acoustic Sessions", arena: "Denver Club Arena", state: "CO", date: "Aug 18", ticketPrice: 35, vipPrice: 89, soldPercent: 62, genre: "Indie" },
  { id: "e3", artist: "DJ Prism", artistAvatar: "DP", title: "Bass Drop Festival", arena: "Miami Arena", state: "FL", date: "Aug 20", ticketPrice: 75, vipPrice: 199, soldPercent: 94, genre: "EDM" },
  { id: "e4", artist: "Luna Vale", artistAvatar: "LV", title: "Soul Sessions", arena: "Atlanta Theater", state: "GA", date: "Aug 25", ticketPrice: 40, vipPrice: 99, soldPercent: 48, genre: "R&B" },
  { id: "e5", artist: "Nova Ray", artistAvatar: "NR", title: "VIP Listening Party", arena: "LA Club Arena", state: "CA", date: "Sep 1", ticketPrice: 55, vipPrice: 175, soldPercent: 71, genre: "Electronic" },
];

export const ARENA_OPTIONS = [
  { id: "community" as const, name: "Community Arena", capacity: 2500, fee: 25 },
  { id: "club" as const, name: "Club Arena", capacity: 5000, fee: 50 },
  { id: "theater" as const, name: "Theater Arena", capacity: 8500, fee: 100 },
  { id: "arena" as const, name: "Arena", capacity: 12000, fee: 250 },
  { id: "stadium" as const, name: "Stadium", capacity: 18000, fee: 500 },
];

export const REVENUE_CHART = [
  { month: "Jan", revenue: 82000, attendance: 4200, merch: 12000 },
  { month: "Feb", revenue: 95000, attendance: 5100, merch: 14500 },
  { month: "Mar", revenue: 118000, attendance: 6800, merch: 18200 },
  { month: "Apr", revenue: 142000, attendance: 8200, merch: 22400 },
  { month: "May", revenue: 168000, attendance: 9800, merch: 28900 },
  { month: "Jun", revenue: 195000, attendance: 11200, merch: 34200 },
  { month: "Jul", revenue: 224000, attendance: 12800, merch: 39800 },
];

export const STATES_REACHED = [
  { state: "TX", fans: 42000 }, { state: "CA", fans: 38000 }, { state: "NY", fans: 35000 },
  { state: "FL", fans: 28000 }, { state: "TN", fans: 22000 }, { state: "IL", fans: 19000 },
  { state: "CO", fans: 15000 }, { state: "GA", fans: 14000 }, { state: "WA", fans: 12000 },
  { state: "AZ", fans: 11000 },
];

export const DEMO_STATES: DemoStateArena[] = [
  { state: "Texas", abbr: "TX", arenas: 12, upcomingShows: 28, ticketsSold: 142000, audience: 890000, sponsor: "TechCorp", fanGrowth: 18.2, featuredArtist: "Nova Ray" },
  { state: "California", abbr: "CA", arenas: 18, upcomingShows: 45, ticketsSold: 198000, audience: 1_200_000, sponsor: "StreamMax", fanGrowth: 22.4, featuredArtist: "DJ Prism" },
  { state: "New York", abbr: "NY", arenas: 14, upcomingShows: 38, ticketsSold: 165000, audience: 980000, sponsor: "UrbanBeat", fanGrowth: 15.8, featuredArtist: "The Midnight Echo" },
  { state: "Florida", abbr: "FL", arenas: 10, upcomingShows: 32, ticketsSold: 128000, audience: 720000, fanGrowth: 20.1, featuredArtist: "DJ Prism" },
  { state: "Tennessee", abbr: "TN", arenas: 8, upcomingShows: 22, ticketsSold: 98000, audience: 580000, sponsor: "MusicFirst", fanGrowth: 16.5, featuredArtist: "Nova Ray" },
  { state: "Illinois", abbr: "IL", arenas: 9, upcomingShows: 24, ticketsSold: 112000, audience: 640000, fanGrowth: 14.2, featuredArtist: "Luna Vale" },
  { state: "Colorado", abbr: "CO", arenas: 6, upcomingShows: 16, ticketsSold: 72000, audience: 420000, fanGrowth: 19.8 },
  { state: "Georgia", abbr: "GA", arenas: 7, upcomingShows: 18, ticketsSold: 84000, audience: 480000, fanGrowth: 17.3, featuredArtist: "Luna Vale" },
  { state: "Washington", abbr: "WA", arenas: 5, upcomingShows: 14, ticketsSold: 68000, audience: 390000, fanGrowth: 21.0 },
  { state: "Arizona", abbr: "AZ", arenas: 5, upcomingShows: 12, ticketsSold: 58000, audience: 340000, fanGrowth: 23.5 },
];

export const STATE_MAP_POSITIONS: Record<string, { x: number; y: number }> = {
  TX: { x: 38, y: 72 }, CA: { x: 8, y: 52 }, NY: { x: 82, y: 28 },
  FL: { x: 78, y: 78 }, TN: { x: 62, y: 58 }, IL: { x: 58, y: 38 },
  CO: { x: 32, y: 42 }, GA: { x: 68, y: 68 }, WA: { x: 12, y: 12 },
  AZ: { x: 22, y: 62 }, PA: { x: 78, y: 32 }, OH: { x: 68, y: 38 },
  MI: { x: 62, y: 28 }, NC: { x: 74, y: 58 }, VA: { x: 76, y: 48 },
  MA: { x: 88, y: 22 }, NJ: { x: 82, y: 32 }, MN: { x: 48, y: 22 },
  MO: { x: 52, y: 48 }, LA: { x: 52, y: 78 }, OR: { x: 8, y: 22 },
  NV: { x: 16, y: 48 }, UT: { x: 26, y: 42 }, NM: { x: 32, y: 62 },
};

export const TOUR_CONNECTIONS = [
  { from: "TX", to: "TN" }, { from: "TN", to: "IL" }, { from: "IL", to: "NY" },
  { from: "CA", to: "AZ" }, { from: "AZ", to: "TX" }, { from: "FL", to: "GA" },
  { from: "GA", to: "NC" }, { from: "CO", to: "CA" }, { from: "WA", to: "CO" },
];

export const DEMO_SPONSOR_ARENAS: DemoSponsorArena[] = [
  { id: "sp1", name: "Texas Theater Arena", state: "TX", tier: "theater", monthlyVisitors: 890000, engagement: 94, availableSlots: ["Naming Rights", "LED Screens", "VIP Lounge"], founderPrice: 25000, regularPrice: 50000, expectedReach: 2_400_000 },
  { id: "sp2", name: "Music City Arena", state: "TN", tier: "arena", monthlyVisitors: 580000, engagement: 91, availableSlots: ["Naming Rights", "Merch Booth", "Billboards"], founderPrice: 50000, regularPrice: 100000, expectedReach: 1_800_000 },
  { id: "sp3", name: "Sunset Stadium", state: "CA", tier: "stadium", monthlyVisitors: 1_200_000, engagement: 96, availableSlots: ["Naming Rights", "Drone Fleet", "Homepage Hero"], founderPrice: 100000, regularPrice: 200000, expectedReach: 4_200_000 },
  { id: "sp4", name: "Windy City Arena", state: "IL", tier: "arena", monthlyVisitors: 640000, engagement: 89, availableSlots: ["LED Screens", "Waiting Room Ads"], founderPrice: 50000, regularPrice: 100000, expectedReach: 1_600_000 },
  { id: "sp5", name: "Miami Beach Arena", state: "FL", tier: "theater", monthlyVisitors: 720000, engagement: 92, availableSlots: ["Naming Rights", "Festival Sponsorship"], founderPrice: 25000, regularPrice: 50000, expectedReach: 1_900_000 },
];

export const INITIAL_FEED: DemoFeedItem[] = [
  { id: "f1", type: "show", author: "Nova Ray", authorAvatar: "NR", verified: true, content: "Just announced: Neon Dreams Tour hits Nashville Aug 22! 🎤", likes: 2840, comments: 412, shares: 890, hashtag: "#NeonDreamsTour", timestamp: "2m ago" },
  { id: "f2", type: "clip", author: "Sarah M.", authorAvatar: "SM", content: "Best virtual concert experience ever. The arena felt REAL 🔥", likes: 892, comments: 67, shares: 124, timestamp: "5m ago" },
  { id: "f3", type: "milestone", author: "DJ Prism", authorAvatar: "DP", verified: true, content: "1 MILLION fans on LiveCircuit! Thank you 🙏", likes: 12400, comments: 2100, shares: 3400, hashtag: "#1MillionStrong", timestamp: "8m ago" },
  { id: "f4", type: "comment", author: "Mike T.", authorAvatar: "MT", content: "VIP lounge upgrade was worth every penny. Met other super fans!", likes: 234, comments: 18, shares: 12, timestamp: "12m ago" },
  { id: "f5", type: "show", author: "The Midnight Echo", authorAvatar: "ME", verified: true, content: "Acoustic Sessions — Denver, Aug 18. Intimate. Unforgettable.", likes: 1560, comments: 289, shares: 445, timestamp: "15m ago" },
];

export const FEED_TEMPLATES: Omit<DemoFeedItem, "id" | "timestamp">[] = [
  { type: "clip", author: "Alex K.", authorAvatar: "AK", content: "Crowd energy is INSANE right now 🎸", likes: 456, comments: 34, shares: 78 },
  { type: "show", author: "Luna Vale", authorAvatar: "LV", verified: true, content: "Soul Sessions tour — 6 cities, infinite vibes ✨", likes: 1890, comments: 267, shares: 534, hashtag: "#SoulSessions" },
  { type: "comment", author: "Jamie L.", authorAvatar: "JL", content: "Digital touring changed everything for indie artists", likes: 678, comments: 89, shares: 156 },
  { type: "milestone", author: "LiveCircuit", authorAvatar: "LC", verified: true, content: "50 states. 500+ digital arenas. One platform. 🌎", likes: 8900, comments: 1200, shares: 4500, hashtag: "#DigitalTouring" },
];

export const FINALE_STATS = [
  { label: "States", value: 50, suffix: "" },
  { label: "Digital Arenas", value: 500, suffix: "+" },
  { label: "Artists", value: 10000, suffix: "+" },
  { label: "Fans", value: 5, suffix: "M+" },
  { label: "Digital Tours", value: 0, suffix: "Unlimited", isText: true },
];

export const CHAT_MESSAGES = [
  { user: "fan_tx_42", message: "THIS DROP 🔥🔥🔥", emoji: "🔥" },
  { user: "musiclover99", message: "Best show of the year", emoji: "❤️" },
  { user: "nova_superfan", message: "VIP lounge is amazing!", emoji: "⭐" },
  { user: "dj_prism_crew", message: "Encore!!!", emoji: "🎉" },
  { user: "austin_raver", message: "Texas represent 🌵", emoji: "🤘" },
];

export const AI_RECOMMENDATIONS = [
  { artist: "Nova Ray", insight: "Your artist should schedule another show in Texas next week.", detail: "Houston and San Antonio show 82% audience overlap with Dallas.", projectedRevenue: 28000, confidence: 94 },
  { artist: "DJ Prism", insight: "Miami and Orlando show strong EDM demand.", detail: "Combined weekend festival slot could 2× ticket velocity.", projectedRevenue: 45000, confidence: 89 },
  { artist: "Luna Vale", insight: "Atlanta R&B audience overlap is 78%.", detail: "Pair with local soul collective for co-headline boost.", projectedRevenue: 18500, confidence: 86 },
  { artist: "The Midnight Echo", insight: "Pacific Northwest acoustic tour extension recommended.", detail: "Portland and Seattle searches up 34% this month.", projectedRevenue: 22000, confidence: 91 },
  { artist: "Kai Rivers", insight: "Chicago hip-hop market ready for arena upgrade.", detail: "Current club shows at 98% capacity — move to 8K venue.", projectedRevenue: 52000, confidence: 88 },
];
