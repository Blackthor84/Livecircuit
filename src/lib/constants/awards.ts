export const AWARD_CATEGORIES = [
  {
    value: "artist_of_the_year",
    label: "Artist of the Year",
    blurb: "The defining performer on LiveCircuit this year.",
  },
  {
    value: "concert_of_the_year",
    label: "Concert of the Year",
    blurb: "The must-see live event that sold the circuit.",
  },
  {
    value: "comedian_of_the_year",
    label: "Comedian of the Year",
    blurb: "Stand-up and comedy that owned the room.",
  },
  {
    value: "dj_of_the_year",
    label: "DJ of the Year",
    blurb: "Sets that kept the global dance floor moving.",
  },
  {
    value: "podcast_of_the_year",
    label: "Podcast of the Year",
    blurb: "Conversations and shows fans binged all year.",
  },
  {
    value: "venue_of_the_year",
    label: "Venue of the Year",
    blurb: "The room that hosted unforgettable nights.",
  },
  {
    value: "best_new_artist",
    label: "Best New Artist",
    blurb: "Breakout talent in their first year on the circuit.",
  },
  {
    value: "fan_favorite",
    label: "Fan Favorite",
    blurb: "Chosen by the community through follows and votes.",
  },
  {
    value: "best_community",
    label: "Best Community",
    blurb: "Where fans chat, review, and show up together.",
  },
  {
    value: "highest_rated_event",
    label: "Highest Rated Event",
    blurb: "Top-rated show by fan reviews.",
  },
] as const;

export type AwardCategory = (typeof AWARD_CATEGORIES)[number]["value"];

export function awardCategoryLabel(category: string): string {
  return AWARD_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export function awardCategoryBlurb(category: string): string {
  return AWARD_CATEGORIES.find((c) => c.value === category)?.blurb ?? "";
}
