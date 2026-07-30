import type {
  AudioAnalysis,
  LightingAnalysis,
  NetworkTestResult,
  StreamCoachSuggestion,
  StreamHealthMetrics,
} from "@/lib/streaming/studio/types";

/** Future-ready hook for AI stream coaching. Currently rule-based. */
export function buildStreamCoachSuggestions(input: {
  audio?: AudioAnalysis | null;
  lighting?: LightingAnalysis | null;
  health?: StreamHealthMetrics | null;
  network?: NetworkTestResult | null;
}): StreamCoachSuggestion[] {
  const suggestions: StreamCoachSuggestion[] = [];
  const now = Date.now();

  if (input.audio?.isClipping) {
    suggestions.push({
      id: "audio-clipping",
      category: "audio",
      message: "Your voice is clipping — reduce gain or move back from the mic.",
      severity: "red",
      timestamp: now,
    });
  }
  if (input.audio?.echoWarning) {
    suggestions.push({
      id: "audio-echo",
      category: "audio",
      message: "Echo detected — use headphones to prevent feedback.",
      severity: "yellow",
      timestamp: now,
    });
  }
  if (input.audio?.noiseDetected) {
    suggestions.push({
      id: "audio-noise",
      category: "audio",
      message: "Background noise increased — try a quieter room or closer mic placement.",
      severity: "yellow",
      timestamp: now,
    });
  }

  for (const tip of input.lighting?.suggestions ?? []) {
    suggestions.push({
      id: `lighting-${tip.slice(0, 12)}`,
      category: "lighting",
      message: tip,
      severity: input.lighting?.status ?? "yellow",
      timestamp: now,
    });
  }

  if (input.health?.connectionQuality === "red") {
    suggestions.push({
      id: "network-quality",
      category: "network",
      message: "Connection quality dropped — check your upload speed.",
      severity: "red",
      timestamp: now,
    });
  }

  if (input.network && !input.network.stable) {
    suggestions.push({
      id: "network-unstable",
      category: "network",
      message: "Your connection may not support stable HD streaming.",
      severity: "yellow",
      timestamp: now,
    });
  }

  return suggestions;
}
