import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseStreamMetadata,
  publicRecordingUrl,
  recordingPathForEvent,
  type RecordingStatus,
  type StreamMetadata,
} from "@/lib/streaming/stream-metadata";

export type StreamRecordingState = {
  recordingUrl: string | null;
  recordingStatus: RecordingStatus;
  metadata: StreamMetadata;
};

export async function getStreamRecordingState(
  supabase: SupabaseClient,
  eventId: string
): Promise<StreamRecordingState | null> {
  const { data } = await supabase
    .from("streams")
    .select("recording_url, metadata")
    .eq("event_id", eventId)
    .maybeSingle();

  if (!data) return null;

  const metadata = parseStreamMetadata(data.metadata);
  const recordingStatus = metadata.recording_status ?? (data.recording_url ? "ready" : "none");

  return {
    recordingUrl: (data.recording_url as string | null) ?? null,
    recordingStatus,
    metadata,
  };
}

export async function markRecordingProcessing(
  supabase: SupabaseClient,
  eventId: string,
  egressId: string | null
) {
  const { data } = await supabase
    .from("streams")
    .select("metadata")
    .eq("event_id", eventId)
    .maybeSingle();

  const metadata = parseStreamMetadata(data?.metadata);
  await supabase
    .from("streams")
    .update({
      metadata: {
        ...metadata,
        egress_id: egressId,
        recording_status: egressId ? "processing" : metadata.recording_status ?? "none",
      },
    })
    .eq("event_id", eventId);
}

export async function finalizeRecordingUrl(
  supabase: SupabaseClient,
  eventId: string,
  filepath: string
) {
  const url = publicRecordingUrl(filepath);
  const { data } = await supabase
    .from("streams")
    .select("metadata")
    .eq("event_id", eventId)
    .maybeSingle();

  const metadata = parseStreamMetadata(data?.metadata);
  await supabase
    .from("streams")
    .update({
      recording_url: url,
      metadata: {
        ...metadata,
        recording_status: "ready",
        recording_error: null,
      },
    })
    .eq("event_id", eventId);

  return url;
}

export async function setManualRecordingUrl(
  supabase: SupabaseClient,
  eventId: string,
  recordingUrl: string
) {
  const { data } = await supabase
    .from("streams")
    .select("metadata")
    .eq("event_id", eventId)
    .maybeSingle();

  const metadata = parseStreamMetadata(data?.metadata);
  await supabase
    .from("streams")
    .update({
      recording_url: recordingUrl,
      metadata: {
        ...metadata,
        recording_status: "ready",
        recording_error: null,
      },
    })
    .eq("event_id", eventId);
}

export async function updateStreamLobbySettings(
  supabase: SupabaseClient,
  eventId: string,
  input: {
    lobbyMessage?: string | null;
    lobbyVideoUrl?: string | null;
    lobbyBannerUrl?: string | null;
  }
) {
  const { data } = await supabase
    .from("streams")
    .select("metadata")
    .eq("event_id", eventId)
    .maybeSingle();

  const metadata = parseStreamMetadata(data?.metadata);
  await supabase
    .from("streams")
    .update({
      metadata: {
        ...metadata,
        lobby_message: input.lobbyMessage ?? metadata.lobby_message ?? null,
        lobby_video_url: input.lobbyVideoUrl ?? metadata.lobby_video_url ?? null,
        lobby_banner_url: input.lobbyBannerUrl ?? metadata.lobby_banner_url ?? null,
      },
    })
    .eq("event_id", eventId);
}

export function defaultRecordingFilepath(eventId: string) {
  return recordingPathForEvent(eventId);
}
