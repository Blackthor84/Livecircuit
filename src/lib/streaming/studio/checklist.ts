import type { StudioChecklist, StudioChecklistKey } from "@/lib/streaming/studio/types";

export const STUDIO_CHECKLIST_ITEMS: {
  key: StudioChecklistKey;
  label: string;
  required: boolean;
}[] = [
  { key: "camera_connected", label: "Camera connected", required: true },
  { key: "microphone_connected", label: "Microphone connected", required: true },
  { key: "internet_stable", label: "Internet stable", required: true },
  { key: "audio_tested", label: "Audio tested", required: true },
  { key: "video_tested", label: "Video tested", required: true },
  { key: "lighting_acceptable", label: "Lighting acceptable", required: false },
  { key: "test_recording_reviewed", label: "Test recording reviewed", required: false },
  { key: "fan_review_completed", label: "Optional fan review completed", required: false },
];

export function checklistProgress(checklist: StudioChecklist) {
  const required = STUDIO_CHECKLIST_ITEMS.filter((item) => item.required);
  const completedRequired = required.filter((item) => checklist[item.key]).length;
  const totalCompleted = STUDIO_CHECKLIST_ITEMS.filter((item) => checklist[item.key]).length;
  return {
    completedRequired,
    requiredTotal: required.length,
    totalCompleted,
    totalItems: STUDIO_CHECKLIST_ITEMS.length,
    ready: completedRequired === required.length,
  };
}

export function defaultChecklist(): StudioChecklist {
  return {};
}
