import type { SupabaseClient } from "@supabase/supabase-js";
import type { GoLiveChecklist, ProductionHistoryEntry } from "@/lib/production/studio";

export async function openGreenRoom(supabase: SupabaseClient, eventId: string) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("stream_rehearsals").upsert(
    {
      event_id: eventId,
      status: "open",
      green_room_opened_at: now,
      opened_at: now,
      updated_at: now,
    },
    { onConflict: "event_id" }
  );
  if (error) throw new Error(error.message);
}

export async function setSoundCheckActive(supabase: SupabaseClient, eventId: string, active: boolean) {
  const { error } = await supabase
    .from("stream_rehearsals")
    .update({ sound_check_active: active, updated_at: new Date().toISOString() })
    .eq("event_id", eventId);
  if (error) throw new Error(error.message);
}

export async function updateGoLiveChecklist(supabase: SupabaseClient, eventId: string, checklist: GoLiveChecklist) {
  const { error } = await supabase
    .from("stream_rehearsals")
    .update({ go_live_checklist: checklist, updated_at: new Date().toISOString() })
    .eq("event_id", eventId);
  if (error) throw new Error(error.message);
}

export async function getGoLiveChecklist(supabase: SupabaseClient, eventId: string): Promise<GoLiveChecklist> {
  const { data } = await supabase
    .from("stream_rehearsals")
    .select("go_live_checklist")
    .eq("event_id", eventId)
    .maybeSingle();
  return (data?.go_live_checklist ?? {}) as GoLiveChecklist;
}

export async function saveProductionHistory(
  supabase: SupabaseClient,
  input: {
    eventId: string;
    sessionType: ProductionHistoryEntry["session_type"];
    summary?: Record<string, unknown>;
    producerNotes?: unknown[];
    fanRatings?: unknown[];
    technical?: Record<string, unknown>;
    equipment?: Record<string, unknown>;
    recommendations?: unknown[];
  }
) {
  const { error } = await supabase.from("production_history").insert({
    event_id: input.eventId,
    session_type: input.sessionType,
    summary: input.summary ?? {},
    producer_notes: input.producerNotes ?? [],
    fan_ratings: input.fanRatings ?? [],
    technical: input.technical ?? {},
    equipment: input.equipment ?? {},
    recommendations: input.recommendations ?? [],
  });
  if (error) throw new Error(error.message);
}

export async function listProductionHistory(supabase: SupabaseClient, eventId: string) {
  const { data } = await supabase
    .from("production_history")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(30);
  return (data ?? []) as ProductionHistoryEntry[];
}
