export const VENUE_HOF_CATEGORIES = [
  { value: "top_attendance", label: "Top attendance", blurb: "The show that sold the most tickets here." },
  { value: "top_revenue", label: "Top revenue", blurb: "Highest grossing artist at this venue." },
  { value: "most_viewed", label: "Most viewed", blurb: "The live room with the most fan energy." },
  { value: "highest_rated", label: "Highest rated", blurb: "Best-reviewed performance." },
  { value: "most_tips", label: "Most tips", blurb: "Artist fans tipped the most during shows." },
  { value: "most_merchandise", label: "Most merchandise sold", blurb: "Top merch mover tied to this stage." },
  { value: "longest_running_show", label: "Longest running show", blurb: "Marathon set that kept the room buzzing." },
  { value: "fan_favorite", label: "Fan favorite", blurb: "Artist with the deepest ticket fanbase here." },
  { value: "most_loyal_fans", label: "Most loyal fans", blurb: "Superfan with the highest venue loyalty." },
] as const;

export type VenueHofCategory = (typeof VENUE_HOF_CATEGORIES)[number]["value"];

export function venueHofCategoryLabel(value: string) {
  return VENUE_HOF_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function venueHofCategoryBlurb(value: string) {
  return VENUE_HOF_CATEGORIES.find((c) => c.value === value)?.blurb ?? "";
}
