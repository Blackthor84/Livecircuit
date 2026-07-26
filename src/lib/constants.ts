export const APP_NAME = "LiveCircuit";
export const APP_TAGLINE = "Tour the world without leaving home.";
export const APP_DESCRIPTION =
  "Live virtual tours, concerts, comedy, podcasts, and more — with fan heat maps that help artists plan their next stop.";

export const ARTIST_CATEGORIES = [
  { value: "music", label: "Music" },
  { value: "comedy", label: "Comedy" },
  { value: "podcast", label: "Podcasts" },
  { value: "author", label: "Authors" },
  { value: "gaming", label: "Gaming" },
  { value: "dj", label: "DJ" },
  { value: "theater", label: "Theater" },
  { value: "magic", label: "Magic" },
  { value: "fitness", label: "Fitness" },
  { value: "cooking", label: "Cooking" },
  { value: "education", label: "Education" },
  { value: "religion", label: "Religion" },
  { value: "motivational", label: "Motivational" },
  { value: "other", label: "Other" },
] as const;

export const REACTION_EMOJIS = ["❤️", "🔥", "👏", "😂"] as const;

export const ROUTES = {
  home: "/",
  discover: "/discover",
  artists: "/artists",
  search: "/search",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  settings: "/settings",
  profile: "/profile",
  notifications: "/notifications",
  messages: "/messages",
  dashboard: "/dashboard",
  passport: "/passport",
  seasons: "/seasons",
  festivals: "/festivals",
  artistDashboard: "/artist/dashboard",
  admin: "/admin",
  adminVenues: "/admin/venues",
  venues: "/livecircuit/venues",
  venueCollections: "/collections/venues",
  friends: "/friends",
  coins: "/coins",
  marketplace: "/marketplace",
  localBusiness: "/local-business",
  sponsor: "/sponsor",
  vip: "/vip",
  checkout: "/checkout",
  walkOfFame: "/walk-of-fame",
  awards: "/awards",
  world: "/world",
  achievements: "/achievements",
  gamification: "/gamification",
  following: "/following",
  about: "/about",
  artistEventsNew: "/artist/events/new",
  artistEvent: (eventId: string) => `/artist/events/${eventId}`,
  artistEventLive: (artistSlug: string, eventSlug: string) =>
    `/artists/${artistSlug}/events/${eventSlug}`,
} as const;
