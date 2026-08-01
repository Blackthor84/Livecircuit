export const DIGITAL_TOURING_BRAND = {
  platformName: "The World's First Digital Touring Platform",
  tagline: "Tour the World Without Leaving Home",
  heroHeadline: "The World's First Digital Touring Platform",
  heroSubheadline:
    "Create digital tours where every stop is a real city, real arena, and real audience. Perform in Boston. Then New York. Then Chicago. Then Los Angeles. All in one night.",
  heroAltHeadlines: [
    "Tour the World Without Leaving Home",
    "Perform Across Cities, States, and Countries in One Night.",
    "Your Next Tour Starts Here.",
  ] as const,
  primaryCta: "Start Your Tour",
  secondaryCta: "Explore Live Tours",
  fanMantra: "Fans don't watch streams. Fans follow tours.",
  artistMantra: "Artists don't go live. Artists go on Digital Tours.",
  streamingNote: "Streaming is the technology that powers the tour. The tour is the product.",
} as const;

export const DEMO_TOUR_ROUTE = {
  tourName: "New England Digital Tour",
  artistName: "Featured Artist",
  stops: [
    { city: "Boston", state: "MA", status: "completed" as const },
    { city: "Providence", state: "RI", status: "completed" as const },
    { city: "New York", state: "NY", status: "live" as const },
    { city: "Philadelphia", state: "PA", status: "next" as const },
    { city: "Washington DC", state: "DC", status: "upcoming" as const },
    { city: "Atlanta", state: "GA", status: "upcoming" as const },
    { city: "Miami", state: "FL", status: "upcoming" as const },
  ],
} as const;

export const GLOBAL_TOUR_CITIES = [
  { city: "Boston", country: "USA", lat: 42.36, lng: -71.06, active: true },
  { city: "London", country: "UK", lat: 51.51, lng: -0.13, active: true },
  { city: "Tokyo", country: "Japan", lat: 35.68, lng: 139.69, active: false },
  { city: "Sydney", country: "Australia", lat: -33.87, lng: 151.21, active: false },
  { city: "Chicago", country: "USA", lat: 41.88, lng: -87.63, active: true },
  { city: "Paris", country: "France", lat: 48.86, lng: 2.35, active: false },
  { city: "São Paulo", country: "Brazil", lat: -23.55, lng: -46.63, active: false },
  { city: "Mumbai", country: "India", lat: 19.08, lng: 72.88, active: false },
] as const;

export const POPULAR_TOUR_CITIES = [
  { city: "New York", stops: 128 },
  { city: "Los Angeles", stops: 96 },
  { city: "Chicago", stops: 84 },
  { city: "London", stops: 72 },
  { city: "Boston", stops: 68 },
  { city: "Atlanta", stops: 61 },
] as const;

export const WHY_DIGITAL_TOURING = [
  {
    title: "Multi-City Tours",
    body: "One tour, many cities — each stop is a real place with real fans waiting in a digital arena.",
  },
  {
    title: "Tour Stops, Not Streams",
    body: "Every performance is a stop on the route. Fans follow the journey city by city.",
  },
  {
    title: "Digital Passport",
    body: "Fans collect stamps for every city they attend. Complete states, countries, and world tours.",
  },
  {
    title: "Real Arenas",
    body: "Community, Club, Theater, Arena, and Stadium tiers — scale your tour as your audience grows.",
  },
  {
    title: "Tour Progress",
    body: "Live progress maps show where the artist has been, where they are now, and what's next.",
  },
  {
    title: "Transparent Ticketing",
    body: "Sell tickets per stop or for the full tour. Artist First — keep 100% of merch, tips, and donations.",
  },
  {
    title: "Tour Merchandise",
    body: "Launch tour-exclusive merch at every stop. Revenue stays with the artist.",
  },
  {
    title: "Sponsor Every Stop",
    body: "Arena and stage sponsorships power the tour — not a cut of fan support.",
  },
] as const;

export const HOW_TOURING_WORKS = {
  fans: [
    "Follow tours across cities, states, and countries",
    "Get notified when your artist reaches the next stop",
    "Collect digital passport stamps at every city",
    "Track tour progress on the live route map",
    "Join the next stop and support artists directly",
  ],
  artists: [
    "Create a digital tour with dates, cities, and arenas",
    "Set ticket pricing, VIP tiers, and tour merchandise",
    "Perform across multiple cities in a single night",
    "Watch fans follow your route in real time",
    "Keep 100% of merch, tips, and donations",
  ],
} as const;

export const HOMEPAGE_TOURING_SEO = [
  "digital touring platform",
  "virtual tour",
  "multi-city digital tour",
  "digital concert tour",
  "tour passport",
  "virtual arenas",
  "ticketed tour stops",
] as const;
