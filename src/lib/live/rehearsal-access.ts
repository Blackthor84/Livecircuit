import type { SupabaseClient } from "@supabase/supabase-js";
import { isAdminRole } from "@/lib/auth/roles";
import { getStreamRehearsal } from "@/lib/data/rehearsal";
import type { RehearsalAccessMode } from "@/lib/streaming/studio/types";

export async function canAccessRehearsal(
  supabase: SupabaseClient,
  userId: string | null | undefined,
  eventId: string,
  inviteToken?: string | null
): Promise<{ allowed: boolean; role: "host" | "reviewer" | null; reason?: string }> {
  if (!userId) {
    return { allowed: false, role: null, reason: "Sign in required" };
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, artist_id, artists(user_id)")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) return { allowed: false, role: null, reason: "Event not found" };

  const artists = event.artists as { user_id: string } | { user_id: string }[] | null;
  const artistUserId = Array.isArray(artists) ? artists[0]?.user_id : artists?.user_id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name, username")
    .eq("id", userId)
    .maybeSingle();

  const isAdmin = isAdminRole(profile?.role);

  const { data: coHost } = await supabase
    .from("event_hosts")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  const isHost = Boolean(artistUserId === userId || coHost || isAdmin);
  if (isHost) return { allowed: true, role: "host" };

  const rehearsal = await getStreamRehearsal(supabase, eventId);
  if (!rehearsal || rehearsal.status !== "open") {
    return { allowed: false, role: null, reason: "Rehearsal is not active" };
  }

  const mode = rehearsal.access_mode as RehearsalAccessMode;

  if (mode === "self_only") {
    return { allowed: false, role: null, reason: "This rehearsal is private" };
  }

  if (mode === "admin" && isAdmin) {
    return { allowed: true, role: "reviewer" };
  }

  if (mode === "moderator") {
    const { data: modHost } = await supabase
      .from("event_hosts")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .maybeSingle();
    if (modHost || isAdmin) return { allowed: true, role: "reviewer" };
  }

  if ((mode === "test_fan" || mode === "invite_link") && inviteToken) {
    if (rehearsal.invite_token === inviteToken) {
      return { allowed: true, role: "reviewer" };
    }
    return { allowed: false, role: null, reason: "Invalid invite link" };
  }

  if (mode === "test_fan" && userId === artistUserId) {
    return { allowed: true, role: "reviewer" };
  }

  return { allowed: false, role: null, reason: "You are not invited to this rehearsal" };
}
