import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config/env";
import { getStreamingProvider } from "@/lib/streaming/provider";

export async function ensureEventStream(eventId: string) {
  if (!isSupabaseConfigured()) return;

  const admin = getSupabaseAdmin();
  const provider = getStreamingProvider();
  const { data: existing } = await admin
    .from("streams")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle();
  if (existing) return;

  await admin.from("streams").insert({
    event_id: eventId,
    provider: provider.name,
    status: "idle",
    playback_url: `/api/stream/${eventId}`,
  });
}
