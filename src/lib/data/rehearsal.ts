import type { SupabaseClient } from "@supabase/supabase-js";
import type { RehearsalAccessMode, RehearsalStatus, StudioChecklist } from "@/lib/streaming/studio/types";

export type StreamRehearsalRow = {
  id: string;
  event_id: string;
  status: RehearsalStatus;
  access_mode: RehearsalAccessMode;
  invite_token: string | null;
  checklist: StudioChecklist;
  producer_checklist?: Record<string, boolean>;
  go_live_checklist?: Record<string, boolean>;
  green_room_opened_at?: string | null;
  sound_check_active?: boolean;
  opened_at: string | null;
  closed_at: string | null;
};

export type RehearsalFeedbackRow = {
  id: string;
  event_id: string;
  reviewer_id: string | null;
  reviewer_label: string | null;
  audio_rating: number | null;
  video_rating: number | null;
  lighting_rating: number | null;
  sync_rating: number | null;
  overall_rating: number | null;
  camera_rating: number | null;
  comment: string | null;
  created_at: string;
};

function generateInviteToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function getStreamRehearsal(
  supabase: SupabaseClient,
  eventId: string
): Promise<StreamRehearsalRow | null> {
  const { data } = await supabase
    .from("stream_rehearsals")
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle();
  return (data as StreamRehearsalRow | null) ?? null;
}

export async function openStreamRehearsal(
  supabase: SupabaseClient,
  eventId: string,
  accessMode: RehearsalAccessMode = "self_only"
): Promise<StreamRehearsalRow> {
  const existing = await getStreamRehearsal(supabase, eventId);
  const now = new Date().toISOString();
  const inviteToken =
    accessMode === "invite_link" || accessMode === "test_fan"
      ? existing?.invite_token ?? generateInviteToken()
      : existing?.invite_token ?? null;

  const payload = {
    event_id: eventId,
    status: "open" as const,
    access_mode: accessMode,
    invite_token: inviteToken,
    opened_at: existing?.opened_at ?? now,
    closed_at: null,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("stream_rehearsals")
    .upsert(payload, { onConflict: "event_id" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as StreamRehearsalRow;
}

export async function updateRehearsalAccessMode(
  supabase: SupabaseClient,
  eventId: string,
  accessMode: RehearsalAccessMode
) {
  const existing = await getStreamRehearsal(supabase, eventId);
  const inviteToken =
    accessMode === "invite_link" || accessMode === "test_fan"
      ? existing?.invite_token ?? generateInviteToken()
      : existing?.invite_token;

  const { error } = await supabase
    .from("stream_rehearsals")
    .update({
      access_mode: accessMode,
      invite_token: inviteToken,
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  return inviteToken ?? null;
}

export async function updateRehearsalChecklist(
  supabase: SupabaseClient,
  eventId: string,
  checklist: StudioChecklist
) {
  const { error } = await supabase
    .from("stream_rehearsals")
    .update({
      checklist,
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", eventId);
  if (error) throw new Error(error.message);
}

export async function closeStreamRehearsal(supabase: SupabaseClient, eventId: string) {
  const { error } = await supabase
    .from("stream_rehearsals")
    .update({
      status: "closed",
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", eventId);
  if (error) throw new Error(error.message);
}

export async function listRehearsalFeedback(supabase: SupabaseClient, eventId: string) {
  const { data } = await supabase
    .from("rehearsal_feedback")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as RehearsalFeedbackRow[];
}

export async function submitRehearsalFeedback(
  supabase: SupabaseClient,
  input: {
    eventId: string;
    reviewerId: string;
    reviewerLabel?: string;
    audioRating: number;
    videoRating: number;
    lightingRating: number;
    syncRating: number;
    overallRating: number;
    cameraRating?: number;
    comment?: string;
  }
) {
  const { error } = await supabase.from("rehearsal_feedback").insert({
    event_id: input.eventId,
    reviewer_id: input.reviewerId,
    reviewer_label: input.reviewerLabel ?? null,
    audio_rating: input.audioRating,
    video_rating: input.videoRating,
    lighting_rating: input.lightingRating,
    sync_rating: input.syncRating,
    overall_rating: input.overallRating,
    camera_rating: input.cameraRating ?? null,
    comment: input.comment?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function getRehearsalByInviteToken(
  supabase: SupabaseClient,
  token: string
): Promise<StreamRehearsalRow | null> {
  const { data } = await supabase
    .from("stream_rehearsals")
    .select("*")
    .eq("invite_token", token)
    .eq("status", "open")
    .maybeSingle();
  return (data as StreamRehearsalRow | null) ?? null;
}
