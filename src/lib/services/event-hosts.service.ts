import type { SupabaseClient } from "@supabase/supabase-js";

export type EventHostRow = {
  id: string;
  event_id: string;
  user_id: string;
  invited_by: string | null;
  created_at: string;
  profiles?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

export async function listEventHosts(
  supabase: SupabaseClient,
  eventId: string
): Promise<EventHostRow[]> {
  const { data } = await supabase
    .from("event_hosts")
    .select("id, event_id, user_id, invited_by, created_at, profiles(display_name, username, avatar_url)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => {
    const profiles = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return { ...row, profiles: profiles ?? null } as EventHostRow;
  });
}

export async function isEventCoHost(
  supabase: SupabaseClient,
  eventId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("event_hosts")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(data);
}

export async function resolveProfileByUsername(supabase: SupabaseClient, username: string) {
  const normalized = username.trim().replace(/^@/, "").toLowerCase();
  if (!normalized) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .eq("username", normalized)
    .maybeSingle();

  return profile;
}

export async function addEventCoHost(
  supabase: SupabaseClient,
  input: { eventId: string; userId: string; invitedBy: string }
) {
  const { error } = await supabase.from("event_hosts").insert({
    event_id: input.eventId,
    user_id: input.userId,
    invited_by: input.invitedBy,
  });

  if (error) throw new Error(error.message);
}

export async function removeEventCoHost(
  supabase: SupabaseClient,
  eventId: string,
  userId: string
) {
  const { error } = await supabase
    .from("event_hosts")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}
