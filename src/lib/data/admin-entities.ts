import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

export async function listAdminUsers(limit = 50) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, role, created_at, onboarding_completed")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listAdminArtists(limit = 50) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("artists")
    .select("id, slug, stage_name, verified, featured, follower_count, monthly_listeners, created_at")
    .order("follower_count", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listAdminFans(limit = 50) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, created_at, country_id, onboarding_completed")
    .eq("role", "fan")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listAdminEvents(limit = 50) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("id, slug, title, status, scheduled_at, viewer_count, peak_viewers, artists(stage_name, slug)")
    .order("scheduled_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listAdminTours(limit = 50) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("tours")
    .select("id, slug, title, status, starts_at, ends_at, artists(stage_name, slug)")
    .order("updated_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listAdminGenres() {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("genres").select("id, slug, name").order("name");
  return data ?? [];
}

export async function getAdminRevenueSummary() {
  if (!isSupabaseConfigured()) {
    return { gmv30d: 0, gmvAllTime: 0, tickets30d: 0, tips30d: 0, ordersByType: [] as { type: string; total: number }[] };
  }

  const supabase = await createClient();
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [orders30, ordersAll, tickets30, tips30] = await Promise.all([
    supabase.from("orders").select("total_cents, order_type").eq("status", "paid").gte("created_at", since30d),
    supabase.from("orders").select("total_cents, order_type").eq("status", "paid"),
    supabase.from("tickets").select("id", { count: "exact", head: true }).gte("created_at", since30d),
    supabase.from("tips").select("amount_cents").gte("created_at", since30d),
  ]);

  const gmv30d = (orders30.data ?? []).reduce((sum, row) => sum + (row.total_cents as number), 0);
  const gmvAllTime = (ordersAll.data ?? []).reduce((sum, row) => sum + (row.total_cents as number), 0);
  const tipsTotal = (tips30.data ?? []).reduce((sum, row) => sum + (row.amount_cents as number), 0);

  const byType = new Map<string, number>();
  for (const row of orders30.data ?? []) {
    const type = row.order_type as string;
    byType.set(type, (byType.get(type) ?? 0) + (row.total_cents as number));
  }

  return {
    gmv30d,
    gmvAllTime,
    tickets30d: tickets30.count ?? 0,
    tips30d: tipsTotal,
    ordersByType: [...byType.entries()].map(([type, total]) => ({ type, total })),
  };
}
