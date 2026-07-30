import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import type { VirtualTouringAnalyticsSummary } from "@/lib/virtual-touring/types";

export async function getVirtualTouringAnalyticsSummary(): Promise<VirtualTouringAnalyticsSummary> {
  const empty: VirtualTouringAnalyticsSummary = {
    attendanceByCity: [],
    attendanceByState: [],
    localVsRemote: { local: 0, remote: 0 },
    avgWatchTimeByCity: [],
    topLoyalFans: [],
    passportCompletionRate: 0,
    strongestLocalArtists: [],
    strongestNationalArtists: [],
  };

  if (!isSupabaseConfigured()) return empty;

  const supabase = await createClient();

  const { data: daily } = await supabase
    .from("virtual_touring_analytics_daily")
    .select("*")
    .gte("analytics_date", new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10))
    .order("analytics_date", { ascending: false })
    .limit(500);

  const rows = daily ?? [];

  const cityMap = new Map<string, { city: string; stateCode: string | null; viewers: number }>();
  const stateMap = new Map<string, number>();
  let localTotal = 0;
  let remoteTotal = 0;
  const watchByCity = new Map<string, { total: number; count: number }>();

  for (const row of rows) {
    const city = row.tour_city as string | null;
    const stateCode = row.tour_state_code as string | null;
    const local = (row.local_viewers as number) ?? 0;
    const remote = (row.remote_viewers as number) ?? 0;
    localTotal += local;
    remoteTotal += remote;

    if (city) {
      const key = `${city}|${stateCode ?? ""}`;
      const cur = cityMap.get(key) ?? { city, stateCode, viewers: 0 };
      cur.viewers += local + remote;
      cityMap.set(key, cur);

      const watch = watchByCity.get(city) ?? { total: 0, count: 0 };
      watch.total += Number(row.total_watch_seconds ?? 0);
      watch.count += 1;
      watchByCity.set(city, watch);
    }

    if (stateCode) {
      stateMap.set(stateCode, (stateMap.get(stateCode) ?? 0) + local + remote);
    }
  }

  const { data: stampRows } = await supabase
    .from("fan_passport_stamps")
    .select("user_id, profiles(display_name)")
    .order("attended_at", { ascending: false })
    .limit(2000);

  const fanCounts = new Map<string, { displayName: string | null; count: number }>();
  for (const s of stampRows ?? []) {
    const uid = s.user_id as string;
    const profile = s.profiles as { display_name: string | null } | { display_name: string | null }[] | null;
    const name = Array.isArray(profile) ? profile[0]?.display_name : profile?.display_name;
    const cur = fanCounts.get(uid) ?? { displayName: name ?? null, count: 0 };
    cur.count += 1;
    fanCounts.set(uid, cur);
  }

  const topLoyalFans = [...fanCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([userId, v]) => ({ userId, displayName: v.displayName, stampCount: v.count }));

  const { count: passportUsers } = await supabase
    .from("fan_passports")
    .select("user_id", { count: "exact", head: true });

  const { count: goldEarned } = await supabase
    .from("fan_passport_user_achievements")
    .select("user_id", { count: "exact", head: true })
    .eq("achievement_slug", "gold_tour_complete");

  const passportCompletionRate =
    passportUsers && passportUsers > 0 ? Math.round(((goldEarned ?? 0) / passportUsers) * 100) : 0;

  return {
    attendanceByCity: [...cityMap.values()].sort((a, b) => b.viewers - a.viewers).slice(0, 15),
    attendanceByState: [...stateMap.entries()]
      .map(([stateCode, viewers]) => ({ stateCode, viewers }))
      .sort((a, b) => b.viewers - a.viewers),
    localVsRemote: { local: localTotal, remote: remoteTotal },
    avgWatchTimeByCity: [...watchByCity.entries()]
      .map(([city, v]) => ({ city, seconds: v.count ? Math.round(v.total / v.count) : 0 }))
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 10),
    topLoyalFans,
    passportCompletionRate,
    strongestLocalArtists: [],
    strongestNationalArtists: [],
  };
}
