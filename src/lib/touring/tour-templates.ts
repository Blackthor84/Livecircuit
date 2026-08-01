import type { TourType } from "@/types/database";

export type TourTemplateStop = {
  countryCode: string;
  citySlug: string;
};

export type TourTemplateDefinition = {
  slug: string;
  name: string;
  tourType: TourType;
  description: string;
  stops: TourTemplateStop[];
  defaultTicketPriceCents: number;
};

/** Built-in tour route templates — mirrored in DB seed migration. */
export const TOUR_TEMPLATES: TourTemplateDefinition[] = [
  {
    slug: "city-tour",
    name: "City Tour",
    tourType: "city",
    description: "One city, one arena — perfect for a focused hometown or destination show.",
    stops: [{ countryCode: "US", citySlug: "new-york" }],
    defaultTicketPriceCents: 1500,
  },
  {
    slug: "multi-city-tour",
    name: "Multi-City Tour",
    tourType: "regional",
    description: "Three major cities in one route — ideal for a weekend digital run.",
    stops: [
      { countryCode: "US", citySlug: "new-york" },
      { countryCode: "US", citySlug: "chicago" },
      { countryCode: "US", citySlug: "los-angeles" },
    ],
    defaultTicketPriceCents: 1800,
  },
  {
    slug: "state-tour",
    name: "State Tour",
    tourType: "state",
    description: "Multiple stops across a single state — California coast to coast.",
    stops: [
      { countryCode: "US", citySlug: "san-diego" },
      { countryCode: "US", citySlug: "los-angeles" },
      { countryCode: "US", citySlug: "san-francisco" },
    ],
    defaultTicketPriceCents: 1600,
  },
  {
    slug: "new-england-tour",
    name: "New England Tour",
    tourType: "regional",
    description: "Boston to Burlington — classic New England cities across seven states.",
    stops: [
      { countryCode: "US", citySlug: "boston" },
      { countryCode: "US", citySlug: "providence" },
      { countryCode: "US", citySlug: "hartford" },
      { countryCode: "US", citySlug: "new-haven" },
      { countryCode: "US", citySlug: "manchester-nh" },
      { countryCode: "US", citySlug: "portland-me" },
      { countryCode: "US", citySlug: "burlington" },
    ],
    defaultTicketPriceCents: 1800,
  },
  {
    slug: "east-coast-tour",
    name: "East Coast Tour",
    tourType: "regional",
    description: "Major cities from Boston to Miami along the Atlantic corridor.",
    stops: [
      { countryCode: "US", citySlug: "boston" },
      { countryCode: "US", citySlug: "new-york" },
      { countryCode: "US", citySlug: "philadelphia" },
      { countryCode: "US", citySlug: "washington-dc" },
      { countryCode: "US", citySlug: "atlanta" },
      { countryCode: "US", citySlug: "miami" },
    ],
    defaultTicketPriceCents: 2000,
  },
  {
    slug: "west-coast-tour",
    name: "West Coast Tour",
    tourType: "regional",
    description: "Seattle to San Diego along the Pacific corridor.",
    stops: [
      { countryCode: "US", citySlug: "seattle" },
      { countryCode: "US", citySlug: "portland-or" },
      { countryCode: "US", citySlug: "san-francisco" },
      { countryCode: "US", citySlug: "los-angeles" },
      { countryCode: "US", citySlug: "san-diego" },
    ],
    defaultTicketPriceCents: 2000,
  },
  {
    slug: "southern-tour",
    name: "Southern Tour",
    tourType: "regional",
    description: "Sun Belt cities from Atlanta to Houston and Miami.",
    stops: [
      { countryCode: "US", citySlug: "atlanta" },
      { countryCode: "US", citySlug: "nashville" },
      { countryCode: "US", citySlug: "dallas" },
      { countryCode: "US", citySlug: "houston" },
      { countryCode: "US", citySlug: "miami" },
    ],
    defaultTicketPriceCents: 1900,
  },
  {
    slug: "midwest-tour",
    name: "Midwest Tour",
    tourType: "regional",
    description: "Heartland cities from Chicago through the Great Lakes to Denver.",
    stops: [
      { countryCode: "US", citySlug: "chicago" },
      { countryCode: "US", citySlug: "detroit" },
      { countryCode: "US", citySlug: "minneapolis" },
      { countryCode: "US", citySlug: "denver" },
    ],
    defaultTicketPriceCents: 1900,
  },
  {
    slug: "usa-tour",
    name: "USA Tour",
    tourType: "national",
    description: "Coast-to-coast national digital route across America.",
    stops: [
      { countryCode: "US", citySlug: "boston" },
      { countryCode: "US", citySlug: "new-york" },
      { countryCode: "US", citySlug: "chicago" },
      { countryCode: "US", citySlug: "denver" },
      { countryCode: "US", citySlug: "los-angeles" },
      { countryCode: "US", citySlug: "seattle" },
    ],
    defaultTicketPriceCents: 2500,
  },
  {
    slug: "north-america-tour",
    name: "North America Tour",
    tourType: "continental",
    description: "United States and Canada — Toronto to Los Angeles.",
    stops: [
      { countryCode: "CA", citySlug: "toronto" },
      { countryCode: "CA", citySlug: "montreal" },
      { countryCode: "US", citySlug: "chicago" },
      { countryCode: "US", citySlug: "dallas" },
      { countryCode: "US", citySlug: "los-angeles" },
    ],
    defaultTicketPriceCents: 3000,
  },
  {
    slug: "europe-tour",
    name: "Europe Tour",
    tourType: "continental",
    description: "London, Paris, Berlin, and Amsterdam — a continental circuit.",
    stops: [
      { countryCode: "GB", citySlug: "london" },
      { countryCode: "FR", citySlug: "paris" },
      { countryCode: "DE", citySlug: "berlin" },
      { countryCode: "NL", citySlug: "amsterdam" },
    ],
    defaultTicketPriceCents: 2800,
  },
  {
    slug: "asia-tour",
    name: "Asia Tour",
    tourType: "continental",
    description: "Tokyo, Singapore, Mumbai, and Seoul — Asia-Pacific digital route.",
    stops: [
      { countryCode: "JP", citySlug: "tokyo" },
      { countryCode: "SG", citySlug: "singapore" },
      { countryCode: "IN", citySlug: "mumbai" },
      { countryCode: "KR", citySlug: "seoul" },
    ],
    defaultTicketPriceCents: 2800,
  },
  {
    slug: "australia-new-zealand-tour",
    name: "Australia & New Zealand Tour",
    tourType: "continental",
    description: "Sydney, Melbourne, Auckland, and Wellington.",
    stops: [
      { countryCode: "AU", citySlug: "sydney" },
      { countryCode: "AU", citySlug: "melbourne" },
      { countryCode: "NZ", citySlug: "auckland" },
      { countryCode: "NZ", citySlug: "wellington" },
    ],
    defaultTicketPriceCents: 2400,
  },
  {
    slug: "south-america-tour",
    name: "South America Tour",
    tourType: "continental",
    description: "São Paulo, Rio de Janeiro, and Buenos Aires.",
    stops: [
      { countryCode: "BR", citySlug: "sao-paulo" },
      { countryCode: "BR", citySlug: "rio-de-janeiro" },
      { countryCode: "AR", citySlug: "buenos-aires" },
    ],
    defaultTicketPriceCents: 2600,
  },
  {
    slug: "africa-tour",
    name: "Africa Tour",
    tourType: "continental",
    description: "Lagos, Johannesburg, and Cairo — a pan-African digital route.",
    stops: [
      { countryCode: "NG", citySlug: "lagos" },
      { countryCode: "ZA", citySlug: "johannesburg" },
      { countryCode: "EG", citySlug: "cairo" },
    ],
    defaultTicketPriceCents: 2600,
  },
  {
    slug: "world-tour",
    name: "World Tour",
    tourType: "world",
    description: "Six continents — New York to São Paulo in one global route.",
    stops: [
      { countryCode: "US", citySlug: "new-york" },
      { countryCode: "GB", citySlug: "london" },
      { countryCode: "FR", citySlug: "paris" },
      { countryCode: "AU", citySlug: "sydney" },
      { countryCode: "JP", citySlug: "tokyo" },
      { countryCode: "BR", citySlug: "sao-paulo" },
    ],
    defaultTicketPriceCents: 3500,
  },
];

export const TOUR_TYPE_LABELS: Record<TourType, string> = {
  city: "City Tour",
  state: "State Tour",
  regional: "Regional Tour",
  national: "National Tour",
  continental: "Continental Tour",
  world: "World Tour",
};

export function getTourTemplate(slug: string): TourTemplateDefinition | undefined {
  return TOUR_TEMPLATES.find((t) => t.slug === slug);
}
