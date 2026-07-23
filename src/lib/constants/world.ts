export const WORLD_ZOOM_LEVELS = [
  { level: "earth", minZoom: 0, maxZoom: 2.2, label: "Earth" },
  { level: "country", minZoom: 2.2, maxZoom: 4.2, label: "Country" },
  { level: "state", minZoom: 4.2, maxZoom: 6.5, label: "State" },
  { level: "city", minZoom: 6.5, maxZoom: 9, label: "City" },
  { level: "venue", minZoom: 9, maxZoom: 13, label: "Venue" },
  { level: "concourse", minZoom: 13, maxZoom: 15, label: "Concourse" },
  { level: "event", minZoom: 15, maxZoom: 22, label: "Event" },
] as const;

export type WorldZoomLevel = (typeof WORLD_ZOOM_LEVELS)[number]["level"];

export const WORLD_CATEGORY_FILTERS = [
  { value: "all", label: "All" },
  { value: "live", label: "Live now" },
  { value: "music", label: "Music" },
  { value: "comedy", label: "Comedy" },
  { value: "dj", label: "DJ" },
  { value: "podcast", label: "Podcast" },
  { value: "festival", label: "Festivals" },
] as const;

export type WorldCategoryFilter = (typeof WORLD_CATEGORY_FILTERS)[number]["value"];

export function worldZoomLevelLabel(level: WorldZoomLevel): string {
  return WORLD_ZOOM_LEVELS.find((z) => z.level === level)?.label ?? level;
}
