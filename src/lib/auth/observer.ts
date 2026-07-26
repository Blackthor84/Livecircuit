import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config/env";

export type ObserverAccount = {
  user_id: string;
  label: string | null;
  active: boolean;
  created_at: string;
  profiles?: {
    display_name: string | null;
    username: string | null;
    email?: string | null;
  } | null;
};

export async function isObserverUser(userId: string | null | undefined): Promise<boolean> {
  if (!userId || !isSupabaseConfigured()) return false;

  const supabase = await createClient();
  const { data } = await supabase
    .from("observer_accounts")
    .select("user_id")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();

  return Boolean(data);
}

export async function logObserverPresence(input: {
  observerId: string;
  eventId?: string | null;
  venueId?: string | null;
}) {
  if (!isSupabaseConfigured()) return;

  try {
    const admin = getSupabaseAdmin();
    await admin.from("observer_presence").insert({
      observer_id: input.observerId,
      event_id: input.eventId ?? null,
      venue_id: input.venueId ?? null,
    });
  } catch {
    /* internal telemetry only */
  }
}

export async function listObserverAccounts(): Promise<ObserverAccount[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("observer_accounts")
    .select("user_id, label, active, created_at, profiles(display_name, username)")
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => {
    const profiles = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return { ...row, profiles: profiles ?? null } as ObserverAccount;
  });
}

export async function countActiveObservers() {
  if (!isSupabaseConfigured()) return 0;
  const supabase = await createClient();
  const { count } = await supabase
    .from("observer_accounts")
    .select("user_id", { count: "exact", head: true })
    .eq("active", true);
  return count ?? 0;
}
