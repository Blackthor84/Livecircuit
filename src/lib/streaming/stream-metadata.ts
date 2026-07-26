export type RecordingStatus = "none" | "processing" | "ready" | "failed";

export type StreamMetadata = {
  egress_id?: string | null;
  recording_status?: RecordingStatus;
  lobby_message?: string | null;
  lobby_video_url?: string | null;
  lobby_banner_url?: string | null;
  recording_error?: string | null;
};

export function parseStreamMetadata(raw: unknown): StreamMetadata {
  if (!raw || typeof raw !== "object") return {};
  return raw as StreamMetadata;
}

export function publicRecordingUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return path;
  if (path.startsWith("http")) return path;
  const normalized = path.replace(/^\//, "");
  return `${base}/storage/v1/object/public/event-recordings/${normalized}`;
}

export function recordingPathForEvent(eventId: string, filename = "recording.mp4") {
  return `${eventId}/${filename}`;
}
