export type DemoExperience = "hub" | "artist" | "fan" | "agency" | "sponsor" | "arena" | "map" | "finale";

export type ArenaTier = "community" | "club" | "theater" | "arena" | "stadium";

export type DemoArtist = {
  id: string;
  name: string;
  slug: string;
  genre: string;
  avatar: string;
  followers: number;
  verified: boolean;
  revenue: number;
  upcomingShows: number;
  statesReached: number;
};

export type DemoShow = {
  id: string;
  title: string;
  arena: string;
  tier: ArenaTier;
  state: string;
  city: string;
  date: string;
  time: string;
  ticketPrice: number;
  vipPrice: number;
  capacity: number;
  sold: number;
  revenue: number;
  status: "upcoming" | "live" | "sold_out";
};

export type DemoEvent = {
  id: string;
  artist: string;
  artistAvatar: string;
  title: string;
  arena: string;
  state: string;
  date: string;
  ticketPrice: number;
  vipPrice: number;
  soldPercent: number;
  genre: string;
};

export type DemoStateArena = {
  state: string;
  abbr: string;
  arenas: number;
  upcomingShows: number;
  ticketsSold: number;
  audience: number;
  sponsor?: string;
  fanGrowth: number;
  featuredArtist?: string;
};

export type DemoSponsorArena = {
  id: string;
  name: string;
  state: string;
  tier: ArenaTier;
  monthlyVisitors: number;
  engagement: number;
  availableSlots: string[];
  founderPrice: number;
  regularPrice: number;
  expectedReach: number;
};

export type DemoFeedItem = {
  id: string;
  type: "show" | "clip" | "comment" | "milestone";
  author: string;
  authorAvatar: string;
  verified?: boolean;
  content: string;
  likes: number;
  comments: number;
  shares: number;
  hashtag?: string;
  timestamp: string;
};

export type ScheduleShowForm = {
  arena: ArenaTier;
  city: string;
  date: string;
  time: string;
  ticketPrice: number;
  vipPrice: number;
  merchOptions: string[];
  expectedAttendance: number;
};

export type DemoArtistProfile = DemoArtist & {
  monthlyListeners: number;
  messages: { id: string; from: string; preview: string; time: string; unread?: boolean }[];
  notifications: { id: string; title: string; time: string; type: "sale" | "fan" | "booking" }[];
  merchSales: number;
  contracts: { id: string; venue: string; date: string; fee: number; status: string }[];
  bookings: { id: string; city: string; date: string; status: string }[];
  sponsorDeals: { id: string; brand: string; value: number; expires: string }[];
  demographics: { label: string; pct: number }[];
  audienceGrowth: { month: string; followers: number }[];
  revenueHistory: { month: string; revenue: number }[];
};
