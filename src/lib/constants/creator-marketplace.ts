export const CREATOR_SERVICE_CATEGORIES = [
  { value: "graphic_designer", label: "Graphic designer" },
  { value: "moderator", label: "Moderator" },
  { value: "video_editor", label: "Video editor" },
  { value: "photographer", label: "Photographer" },
  { value: "manager", label: "Manager" },
  { value: "producer", label: "Producer" },
  { value: "animator", label: "Animator" },
  { value: "lighting_designer", label: "Lighting designer" },
  { value: "marketing_specialist", label: "Marketing specialist" },
  { value: "voice_actor", label: "Voice actor" },
] as const;

export type CreatorServiceCategory = (typeof CREATOR_SERVICE_CATEGORIES)[number]["value"];

export function creatorCategoryLabel(value: string) {
  return CREATOR_SERVICE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
