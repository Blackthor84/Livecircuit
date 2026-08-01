export const APP_NAME = "LiveCircuit";
export const LIVECIRCUIT_LOGO = "/livecircuit-logo.png";
export const LIVECIRCUIT_LOGO_WIDTH = 1024;
export const LIVECIRCUIT_LOGO_HEIGHT = 682;
export const APP_TAGLINE = "The world's first Digital Touring Platform — built Artist First.";
export const APP_DESCRIPTION =
  "LiveCircuit — digital tours across real cities, virtual arenas, and ticketed tour stops. Artists keep 100% of merch, tips, and donations. Fans follow tours, not streams.";

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

export const CONTACT_EMAILS = {
  artists: "artists@watchlivecircuit.com",
  partnerships: "partnerships@watchlivecircuit.com",
} as const;

export const ROUTES = {
  home: "/",
  discover: "/discover",
  tours: "/tours",
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
  artistProfile: (username: string) => `/${username}`,
  namingRightsDemo: "/demo/naming-rights",
  artistSuccessCenter: "/artists/success-center",
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
  contact: "/contact",
  creatorPromise: "/creator-promise",
  agencyHome: "/agency",
  agencyDashboard: "/agency/dashboard",
  agencies: "/agencies",
  artistEventsNew: "/artist/events/new",
  artistEvent: (eventId: string) => `/artist/events/${eventId}`,
  artistEventStudio: (eventId: string) => `/artist/events/${eventId}/production`,
  artistEventProduction: (eventId: string) => `/artist/events/${eventId}/production`,
  artistEventBooth: (eventId: string) => `/artist/events/${eventId}/production?view=studio`,
  artistEventReport: (eventId: string) => `/artist/events/${eventId}/report`,
  artistStreamingAcademy: "/artist/streaming-academy",
  artistEventLive: (artistSlug: string, eventSlug: string) =>
    `/artists/${artistSlug}/events/${eventSlug}`,
} as const;
