import type { EventAudienceMode } from "@/types/database";

export const EVENT_AUDIENCE_MODES: {
  value: EventAudienceMode;
  label: string;
  description: string;
}[] = [
  {
    value: "worldwide",
    label: "Worldwide",
    description: "Any fan with a ticket can attend from anywhere.",
  },
  {
    value: "us_only",
    label: "United States Only",
    description: "Only fans with a U.S. profile location may enter.",
  },
  {
    value: "local_priority",
    label: "Tour City / State Priority Access",
    description: "Local fans enter early with Home Crowd perks, then everyone else joins.",
  },
  {
    value: "local_only",
    label: "Tour City / State Only",
    description: "Only fans whose profile matches the stop city or state may enter.",
  },
  {
    value: "invite_only",
    label: "Invite Only",
    description: "Only invited fans may enter this stop.",
  },
  {
    value: "subscribers_only",
    label: "Subscribers Only",
    description: "Active backstage subscribers only.",
  },
  {
    value: "vip_only",
    label: "VIP Only",
    description: "VIP ticket holders and VIP members only.",
  },
];

export const US_STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia",
};

export const LOCAL_PRIORITY_DEFAULT_MINUTES = 30;

export const TOUR_REWARD_TIERS = [
  { stops: 5, slug: "bronze_tour_5", label: "Bronze Tour Badge" },
  { stops: 10, slug: "silver_tour_10", label: "Silver Tour Badge" },
  { stops: 25, slug: "road_warrior_25", label: "Road Warrior Badge" },
] as const;

/** Subtle skyline accent colors per major tour city */
export const CITY_SKYLINE_ACCENTS: Record<string, string> = {
  Boston: "from-cyan-500/20 via-blue-600/10 to-transparent",
  Providence: "from-violet-500/20 via-indigo-600/10 to-transparent",
  Manchester: "from-emerald-500/20 via-teal-600/10 to-transparent",
  "New York City": "from-amber-500/20 via-orange-600/10 to-transparent",
  "Los Angeles": "from-pink-500/20 via-purple-600/10 to-transparent",
  Dallas: "from-red-500/20 via-rose-600/10 to-transparent",
  Miami: "from-teal-500/20 via-cyan-600/10 to-transparent",
  Seattle: "from-indigo-500/20 via-violet-600/10 to-transparent",
};

export function skylineAccentForCity(city: string | null | undefined): string {
  if (!city) return "from-primary/20 via-primary/5 to-transparent";
  return CITY_SKYLINE_ACCENTS[city] ?? "from-primary/20 via-primary/5 to-transparent";
}
