import type {
  DemoArtist,
  DemoEvent,
  DemoFeedItem,
  DemoShow,
  DemoSponsorArena,
  DemoStateArena,
} from "@/lib/demo/interactive/types";
import { getAgencyRoster, getFanChatMessages, getFeaturedOriginals, getOriginalById, getPrimaryDemoArtist } from "@/lib/demo/originals";

const primary = getPrimaryDemoArtist();
const roster = getAgencyRoster(6);
const featured = getFeaturedOriginals();

function toDemoArtist(entry: { id: string; name: string; genre: string; avatar: string; followers: number; revenue: number; shows: number }): DemoArtist {
  const full = getOriginalById(entry.id);
  return {
    id: entry.id,
    name: entry.name,
    slug: entry.id,
    genre: entry.genre,
    avatar: entry.avatar,
    followers: entry.followers,
    verified: true,
    revenue: entry.revenue,
    upcomingShows: entry.shows,
    statesReached: full ? Math.min(50, 12 + Math.floor(full.monthlyListeners / 100_000)) : 24,
  };
}

export const DEMO_ARTIST: DemoArtist = {
  id: primary.id,
  name: primary.stageName,
  slug: primary.id,
  genre: primary.genre,
  avatar: primary.avatarInitials,
  followers: primary.followers,
  verified: true,
  revenue: primary.revenueTonight,
  upcomingShows: primary.showsScheduled,
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

export const DEMO_AGENCY_ARTISTS: DemoArtist[] = roster.map(toDemoArtist);

export const DEMO_ARTIST_PROFILES: Record<string, {
  contracts: { id: string; venue: string; date: string; fee: number; status: string }[];
  bookings: { id: string; city: string; date: string; status: string }[];
  sponsorDeals: { id: string; brand: string; value: number; expires: string }[];
  demographics: { label: string; pct: number }[];
  audienceGrowth: { month: string; followers: number }[];
  revenueHistory: { month: string; revenue: number }[];
  upcomingTours: { city: string; date: string; venue: string }[];
}> = {
  [primary.id]: {
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

export const DEMO_SHOWS: DemoShow[] = primary.currentTour.upcomingShows.slice(0, 3).map((d, i) => ({
  id: `s${i + 1}`,
  title: `${primary.currentTour.name} — ${d.city}`,
  arena: d.venue,
  tier: i === 1 ? "stadium" as const : "arena" as const,
  state: d.city === "Boston" ? "MA" : d.city === "Chicago" ? "IL" : "TX",
  city: d.city,
  date: `2026-09-${12 + i * 7}`,
  time: i === 1 ? "7:30 PM" : "8:00 PM",
  ticketPrice: 55 + i * 10,
  vipPrice: 149 + i * 26,
  capacity: 10000 + i * 2000,
  sold: 6200 - i * 800,
  revenue: 341_000 - i * 50000,
  status: "upcoming" as const,
}));

export const DEMO_EVENTS: DemoEvent[] = featured.slice(0, 5).map((a, i) => ({
  id: `e${i + 1}`,
  artist: a.stageName,
  artistAvatar: a.avatarInitials,
  title: `${a.currentTour.name} Live`,
  arena: a.currentTour.upcomingShows[0]?.venue ?? "LiveCircuit Arena",
  state: ["TX", "CO", "FL", "GA", "CA"][i] ?? "TX",
  date: a.currentTour.upcomingShows[0]?.date ?? "Aug 15",
  ticketPrice: 35 + i * 8,
  vipPrice: 89 + i * 20,
  soldPercent: 85 - i * 9,
  genre: a.genre,
}));

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
  { state: "Texas", abbr: "TX", arenas: 12, upcomingShows: 28, ticketsSold: 142000, audience: 890000, sponsor: "TechCorp", fanGrowth: 18.2, featuredArtist: featured[4]?.stageName ?? primary.stageName },
  { state: "California", abbr: "CA", arenas: 18, upcomingShows: 45, ticketsSold: 198000, audience: 1_200_000, sponsor: "StreamMax", fanGrowth: 22.4, featuredArtist: featured[2]?.stageName ?? roster[1]?.name ?? primary.stageName },
  { state: "New York", abbr: "NY", arenas: 14, upcomingShows: 38, ticketsSold: 165000, audience: 980000, sponsor: "UrbanBeat", fanGrowth: 15.8, featuredArtist: featured[1]?.stageName ?? roster[2]?.name ?? primary.stageName },
  { state: "Florida", abbr: "FL", arenas: 10, upcomingShows: 32, ticketsSold: 128000, audience: 720000, fanGrowth: 20.1, featuredArtist: featured[2]?.stageName ?? primary.stageName },
  { state: "Tennessee", abbr: "TN", arenas: 8, upcomingShows: 22, ticketsSold: 98000, audience: 580000, sponsor: "MusicFirst", fanGrowth: 16.5, featuredArtist: featured[3]?.stageName ?? primary.stageName },
  { state: "Illinois", abbr: "IL", arenas: 9, upcomingShows: 24, ticketsSold: 112000, audience: 640000, fanGrowth: 14.2, featuredArtist: featured[5]?.stageName ?? roster[3]?.name ?? primary.stageName },
  { state: "Colorado", abbr: "CO", arenas: 6, upcomingShows: 16, ticketsSold: 72000, audience: 420000, fanGrowth: 19.8 },
  { state: "Georgia", abbr: "GA", arenas: 7, upcomingShows: 18, ticketsSold: 84000, audience: 480000, fanGrowth: 17.3, featuredArtist: featured[6]?.stageName ?? roster[4]?.name ?? primary.stageName },
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

export const INITIAL_FEED: DemoFeedItem[] = featured.slice(0, 3).map((a, i) => ({
  id: `f${i + 1}`,
  type: i === 0 ? "show" as const : i === 1 ? "clip" as const : "milestone" as const,
  author: a.stageName,
  authorAvatar: a.avatarInitials,
  verified: true,
  content: i === 0
    ? `Just announced: ${a.currentTour.name} hits ${a.currentTour.upcomingShows[1]?.city ?? "your city"}! 🎤`
    : i === 1
      ? `${a.genre} on LiveCircuit hits different. The arena felt REAL 🔥`
      : `${a.followers.toLocaleString()} fans and counting on LiveCircuit 🙏`,
  likes: 2800 - i * 400,
  comments: 400 - i * 50,
  shares: 800 - i * 100,
  hashtag: `#${a.currentTour.name.replace(/\s+/g, "")}`,
  timestamp: `${2 + i * 3}m ago`,
}));

export const FEED_TEMPLATES: Omit<DemoFeedItem, "id" | "timestamp">[] = roster.slice(0, 3).map((a) => ({
  type: "show" as const,
  author: a.name,
  authorAvatar: a.avatar,
  verified: true,
  content: `${getOriginalById(a.id)?.currentTour.name ?? "Tour"} — live on LiveCircuit ✨`,
  likes: 1890,
  comments: 267,
  shares: 534,
  hashtag: `#LiveCircuit`,
}));

export const CHAT_MESSAGES = getFanChatMessages(primary).map((m) => ({ user: m.user, message: m.message, emoji: m.emoji }));

export const AI_RECOMMENDATIONS = roster.slice(0, 5).map((a) => {
  const full = getOriginalById(a.id)!;
  return {
    artist: a.name,
    insight: `${a.name} should schedule another show in ${full.currentTour.upcomingShows[2]?.city ?? "a new market"} next week.`,
    detail: `${full.genre} demand trending up ${full.growthPct}% this quarter on LiveCircuit.`,
    projectedRevenue: Math.round(a.revenue * 1.4),
    confidence: 85 + (a.growth % 10),
  };
});

export const FINALE_STATS = [
  { label: "States", value: 50, suffix: "" },
  { label: "Digital Arenas", value: 500, suffix: "+" },
  { label: "Artists", value: 120, suffix: "+" },
  { label: "Fans", value: 5, suffix: "M+" },
  { label: "Digital Tours", value: 0, suffix: "Unlimited", isText: true },
];
