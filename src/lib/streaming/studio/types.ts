export type RehearsalAccessMode =
  | "self_only"
  | "admin"
  | "moderator"
  | "test_fan"
  | "invite_link";

export type RehearsalStatus = "open" | "closed";

export type HealthStatus = "green" | "yellow" | "red";

export type StudioChecklistKey =
  | "camera_connected"
  | "microphone_connected"
  | "internet_stable"
  | "audio_tested"
  | "video_tested"
  | "lighting_acceptable"
  | "test_recording_reviewed"
  | "fan_review_completed";

export type StudioChecklist = Partial<Record<StudioChecklistKey, boolean>>;

export type StreamHealthMetrics = {
  latencyMs: number | null;
  fps: number | null;
  bitrateKbps: number | null;
  packetLossPct: number | null;
  droppedFrames: number | null;
  uploadMbps: number | null;
  cpuUsagePct: number | null;
  memoryUsageMb: number | null;
  cameraResolution: string | null;
  microphoneSampleRate: number | null;
  connectionQuality: HealthStatus;
};

export type AudioAnalysis = {
  level: number;
  peak: number;
  isClipping: boolean;
  noiseDetected: boolean;
  echoWarning: boolean;
  suggestions: string[];
};

export type LightingAnalysis = {
  status: HealthStatus;
  suggestions: string[];
  brightness: number;
  faceCentered: boolean;
};

export type NetworkTestResult = {
  downloadMbps: number | null;
  uploadMbps: number | null;
  latencyMs: number | null;
  maxQuality: "480p" | "720p" | "1080p" | "1440p" | "4k";
  stable: boolean;
  warnings: string[];
};

export type RehearsalFeedbackInput = {
  eventId: string;
  audioRating: number;
  videoRating: number;
  lightingRating: number;
  syncRating: number;
  overallRating: number;
  comment?: string;
};

export type RehearsalFeedbackRow = RehearsalFeedbackInput & {
  id: string;
  reviewerLabel: string | null;
  createdAt: string;
};

export type StreamCoachSuggestion = {
  id: string;
  category: "audio" | "video" | "lighting" | "network" | "general";
  message: string;
  severity: HealthStatus;
  timestamp: number;
};
