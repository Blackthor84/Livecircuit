import type { SupabaseClient } from "@supabase/supabase-js";
import { isAdminRole } from "@/lib/auth/roles";

export type TicketCheckInAuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/** Verify the user may check in tickets for the given event (artist, co-host, or admin). */
export async function authorizeTicketCheckIn(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
): Promise<TicketCheckInAuthResult> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (isAdminRole(profile?.role as string | null)) {
    return { ok: true };
  }

  const { data: event } = await supabase
    .from("events")
    .select("artist_id, artists(user_id)")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) {
    return { ok: false, status: 404, error: "Event not found" };
  }

  const artists = event.artists as { user_id: string } | { user_id: string }[] | null;
  const artistUserId = Array.isArray(artists) ? artists[0]?.user_id : artists?.user_id;
  if (artistUserId === userId) {
    return { ok: true };
  }

  const { data: host } = await supabase
    .from("event_hosts")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (host) {
    return { ok: true };
  }

  return { ok: false, status: 403, error: "Not authorized to check in tickets for this event" };
}
