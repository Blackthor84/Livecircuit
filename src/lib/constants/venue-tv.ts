export const VENUE_TV_PROGRAM_TYPES = [
  { value: "upcoming_show", label: "Upcoming shows" },
  { value: "trailer", label: "Trailers" },
  { value: "interview", label: "Artist interviews" },
  { value: "highlight", label: "Highlights" },
  { value: "music_video", label: "Music videos" },
  { value: "comedy_clip", label: "Comedy clips" },
  { value: "festival_announcement", label: "Festival announcements" },
  { value: "sponsor_commercial", label: "Sponsor commercials" },
  { value: "behind_scenes", label: "Behind the scenes" },
  { value: "venue_news", label: "Venue news" },
] as const;

export type VenueTvProgramType = (typeof VENUE_TV_PROGRAM_TYPES)[number]["value"];

export function venueTvProgramLabel(type: string) {
  return VENUE_TV_PROGRAM_TYPES.find((t) => t.value === type)?.label ?? type;
}
