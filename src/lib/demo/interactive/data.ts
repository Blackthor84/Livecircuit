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
  followers: 284_500,
  verified: true,
  revenue: 1_247_800,
  upcomingShows: 12,
  statesReached: 38,
};

export const DEMO_AGENCY_STATS = {
  totalArtists: 47,
  upcomingPerformances: 156,
  revenue: 8_420_000,
  ticketSales: 1_240_000,
  attendance: 3_800_000,
  fanGrowth: 24.5,
  merchRevenue: 890_000,
  sponsorRevenue: 2_100_000,
  activeContracts: 23,
};

export const DEMO_AGENCY_ARTISTS: DemoArtist[] = [
  DEMO_ARTIST,
  { id: "a2", name: "The Midnight Echo", slug: "midnight-echo", genre: "Indie Rock", avatar: "ME", followers: 192_000, verified: true, revenue: 890_400, upcomingShows: 8, statesReached: 28 },
  { id: "a3", name: "DJ Prism", slug: "dj-prism", genre: "House / EDM", avatar: "DP", followers: 412_000, verified: true, revenue: 2_100_000, upcomingShows: 18, statesReached: 44 },
  { id: "a4", name: "Luna Vale", slug: "luna-vale", genre: "R&B / Soul", avatar: "LV", followers: 156_800, verified: false, revenue: 620_000, upcomingShows: 6, statesReached: 22 },
];

export const DEMO_SHOWS: DemoShow[] = [
  { id: "s1", title: "Neon Dreams Tour — Austin", arena: "Texas Theater Arena", tier: "theater", state: "TX", date: "2026-08-15", time: "8:00 PM", ticketPrice: 45, vipPrice: 125, capacity: 8500, sold: 7200, revenue: 384_000, status: "upcoming" },
  { id: "s2", title: "Neon Dreams Tour — Nashville", arena: "Music City Arena", tier: "arena", state: "TN", date: "2026-08-22", time: "7:30 PM", ticketPrice: 55, vipPrice: 150, capacity: 12000, sold: 12000, revenue: 720_000, status: "sold_out" },
  { id: "s3", title: "Neon Dreams Tour — Chicago", arena: "Windy City Stadium", tier: "stadium", state: "IL", date: "2026-09-05", time: "8:00 PM", ticketPrice: 65, vipPrice: 199, capacity: 18000, sold: 14200, revenue: 1_020_000, status: "upcoming" },
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
  { artist: "Nova Ray", insight: "Your artist should perform in Texas next week.", detail: "Estimated revenue: $28,000", confidence: 94 },
  { artist: "DJ Prism", insight: "Miami and Orlando show strong EDM demand.", detail: "Estimated revenue: $45,000 combined", confidence: 89 },
  { artist: "Luna Vale", insight: "Atlanta R&B audience overlap is 78%.", detail: "Estimated revenue: $18,500", confidence: 86 },
];
