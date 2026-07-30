export type GoLiveChecklistKey =
  | "camera_ready"
  | "audio_approved"
  | "lighting_approved"
  | "producer_approved"
  | "network_healthy"
  | "test_fan_approved";

export type GoLiveChecklist = Partial<Record<GoLiveChecklistKey, boolean>>;

export const GO_LIVE_CHECKLIST_ITEMS: { key: GoLiveChecklistKey; label: string }[] = [
  { key: "camera_ready", label: "Camera ready" },
  { key: "audio_approved", label: "Audio approved" },
  { key: "lighting_approved", label: "Lighting approved" },
  { key: "producer_approved", label: "Producer approved" },
  { key: "network_healthy", label: "Network healthy" },
  { key: "test_fan_approved", label: "Test fan approved" },
];

export type ProductionHistoryEntry = {
  id: string;
  event_id: string;
  session_type: "rehearsal" | "sound_check" | "go_live" | "post_show";
  summary: Record<string, unknown>;
  producer_notes: unknown[];
  fan_ratings: unknown[];
  technical: Record<string, unknown>;
  equipment: Record<string, unknown>;
  recommendations: unknown[];
  created_at: string;
};

export type ProductionStudioView = "green_room" | "studio";

export type FanPreviewDevice = "desktop" | "mobile" | "tablet" | "moderator" | "artist" | "audience";

export const FAN_PREVIEW_DEVICES: { id: FanPreviewDevice; label: string; widthClass?: string }[] = [
  { id: "desktop", label: "Desktop fan", widthClass: "w-full" },
  { id: "mobile", label: "Mobile fan", widthClass: "mx-auto max-w-[375px]" },
  { id: "tablet", label: "Tablet fan", widthClass: "mx-auto max-w-[768px]" },
  { id: "audience", label: "Audience view", widthClass: "w-full" },
  { id: "artist", label: "Artist view", widthClass: "w-full" },
  { id: "moderator", label: "Moderator view", widthClass: "w-full" },
];
