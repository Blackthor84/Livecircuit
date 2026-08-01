import { ROUTES } from "@/lib/constants";

/** Honest empty-state copy — never fabricate platform activity. */
export const HOMEPAGE_EMPTY_STATES = {
  liveTours: {
    title: "No tours are live right now.",
    body: "No tours are live yet. Create the first one.",
    ctaLabel: "Start Your Tour",
    ctaHref: `${ROUTES.register}?role=artist`,
  },
  trendingTours: {
    title: "Trending tours will appear here.",
    body: "Trending tours will appear here once artists begin touring.",
    ctaLabel: "Be a Founding Artist",
    ctaHref: `${ROUTES.register}?role=artist`,
  },
  toursStartingSoon: {
    title: "No tours scheduled yet.",
    body: "The first digital world tour starts with you.",
    ctaLabel: "Start Your Tour",
    ctaHref: `${ROUTES.register}?role=artist`,
  },
  mostFollowed: {
    title: "No followed tours yet.",
    body: "Fans will follow routes here once artists publish their first tours.",
    ctaLabel: "Explore tours",
    ctaHref: ROUTES.tours,
  },
  featuredArtists: {
    title: "Featured artists will appear here after launch.",
    body: "Be one of the first artists to launch a Digital Tour on LiveCircuit.",
    ctaLabel: "Join as a Founding Artist",
    ctaHref: `${ROUTES.register}?role=artist`,
  },
  popularCities: {
    title: "No tour cities yet.",
    body: "City rankings will populate as artists schedule stops around the world.",
  },
  popularArenas: {
    title: "No active arenas yet.",
    body: "Virtual arenas will appear when artists assign venues to tour stops.",
  },
  completedTours: {
    title: "No completed tours yet.",
    body: "Finished routes will be archived here after artists complete their first tours.",
    ctaLabel: "Start Your Tour",
    ctaHref: `${ROUTES.register}?role=artist`,
  },
  upcomingStops: {
    title: "No upcoming tour stops.",
    body: "Tickets will appear when artists begin scheduling tours.",
    ctaLabel: "Start Your Tour",
    ctaHref: `${ROUTES.register}?role=artist`,
  },
  passport: {
    title: "Your passport is waiting.",
    body: "Collect city stamps as you attend digital tour stops — the first tours are coming soon.",
    ctaLabel: "Learn about passports",
    ctaHref: ROUTES.passport,
  },
  sponsors: {
    title: "Become a founding sponsor of LiveCircuit.",
    body: "Partner with the world's first Digital Touring Platform at launch.",
    ctaLabel: "Contact us",
    ctaHref: ROUTES.contact,
  },
  globe: {
    title: "The map is ready for the first tour.",
    body: "When artists launch digital routes, live stops and fan activity will appear on the globe in real time.",
  },
  foundingHero: {
    headline: "The first Digital World Tour starts with you.",
    subheadline: "Join the Founding Artist program and launch the first routes on LiveCircuit.",
  },
} as const;

export const FOUNDING_ARTIST_BENEFITS = [
  "Founding Artist badge on your profile",
  "Priority placement on the homepage",
  "Featured in search results",
  "Early access to new platform features",
  "Recognition as one of the first artists on LiveCircuit",
  "Artist First pricing — keep 100% of merch, tips, and donations",
] as const;
