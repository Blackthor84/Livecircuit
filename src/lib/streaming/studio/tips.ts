export type StudioTip = {
  id: string;
  text: string;
  context: "camera" | "audio" | "lighting" | "network" | "general";
};

export const STUDIO_QUICK_TIPS: StudioTip[] = [
  { id: "natural-light", text: "Natural light works great.", context: "lighting" },
  { id: "headphones", text: "Use headphones to prevent echo.", context: "audio" },
  { id: "eye-level", text: "Place your camera at eye level.", context: "camera" },
  { id: "mic-distance", text: "Speak 6–12 inches from your microphone.", context: "audio" },
  { id: "close-apps", text: "Close unnecessary applications before streaming.", context: "network" },
  { id: "test-recording", text: "Record a 10-second clip and listen back before going live.", context: "audio" },
  { id: "fan-preview", text: "Invite a test fan to confirm what viewers will experience.", context: "general" },
  { id: "wired-network", text: "A wired connection is more stable than Wi‑Fi for live video.", context: "network" },
];

export function tipsForContext(context: StudioTip["context"]) {
  return STUDIO_QUICK_TIPS.filter((tip) => tip.context === context);
}

export function randomTip(excludeIds: string[] = []) {
  const pool = STUDIO_QUICK_TIPS.filter((tip) => !excludeIds.includes(tip.id));
  return pool[Math.floor(Math.random() * pool.length)] ?? STUDIO_QUICK_TIPS[0];
}
