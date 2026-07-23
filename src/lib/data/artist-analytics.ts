import { format, startOfMonth, subMonths } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { demoHeatPoints } from "@/lib/data/demo";
import type { FanHeatResult } from "@/lib/maps/heat-types";
import { getArtistFanHeatData } from "@/lib/data/fan-heat";
import { formatCents } from "@/lib/format";
import type { HeatPoint } from "@/lib/maps/heat-types";

export type MonthlyMetric = {
  month: string;
  revenue: number;
  tickets: number;
};

export type ArtistDashboardAnalytics = {
  summary: {
    revenue30dLabel: string;
    tickets30dLabel: string;
    tips30dLabel: string;
    vipMembersLabel: string;
    followersLabel: string;
  };
  monthly: MonthlyMetric[];
  heatPoints: HeatPoint[];
  fanHeat: FanHeatResult;
  topLocations: { label: string; count: number }[];
  upcomingEvents: {
    id: string;
    slug: string;
    title: string;
    scheduledAt: string;
    location: string;
  }[];
};

function monthBuckets(): { key: string; label: string }[] {
  return Array.from({ length: 6 }, (_, i) => {
    const d = startOfMonth(subMonths(new Date(), 5 - i));
    return { key: format(d, "yyyy-MM"), label: format(d, "MMM") };
  });
}

function demoAnalytics(): ArtistDashboardAnalytics {
  return {
    summary: {
      revenue30dLabel: "$10,400",
      tickets30dLabel: "420",
      tips30dLabel: "$1,280",
      vipMembersLabel: "186",
      followersLabel: "124,000",
    },
    monthly: [
      { month: "Jan", revenue: 4200, tickets: 180 },
      { month: "Feb", revenue: 5100, tickets: 210 },
      { month: "Mar", revenue: 6800, tickets: 290 },
      { month: "Apr", revenue: 7200, tickets: 310 },
      { month: "May", revenue: 9100, tickets: 380 },
      { month: "Jun", revenue: 10400, tickets: 420 },
    ],
    heatPoints: demoHeatPoints,
    fanHeat: {
      points: demoHeatPoints.map((p) => ({ ...p, growthPercent: 20 })),
      topLocations: demoHeatPoints.map((p) => ({ label: p.label, count: p.weight, growthPercent: 20 })),
      totals: { fans: 5000, filteredFans: 5000 },
    },
    topLocations: demoHeatPoints.map((p) => ({ label: p.label, count: p.weight })),
    upcomingEvents: [],
  };
}

export async function getArtistDashboardAnalytics(
  artistId: string,
  _artistSlug: string
): Promise<ArtistDashboardAnalytics> {
  if (!isSupabaseConfigured()) {
    return demoAnalytics();
  }

  const supabase = await createClient();
  const buckets = monthBuckets();
  const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5)).toISOString();
  const thirtyDaysAgo = subMonths(new Date(), 1).toISOString();

  const { data: eventRows } = await supabase.from("events").select("id").eq("artist_id", artistId);
  const eventIds = (eventRows ?? []).map((e) => e.id as string);

  const [
    artistRow,
    ordersRes,
    ticketsRes,
    tipsRes,
    vipRes,
    upcomingRes,
  ] = await Promise.all([
    supabase.from("artists").select("follower_count").eq("id", artistId).maybeSingle(),
    supabase
      .from("orders")
      .select("total_cents, created_at, order_type, status")
      .eq("artist_id", artistId)
      .eq("status", "paid")
      .gte("created_at", sixMonthsAgo),
    eventIds.length
      ? supabase
          .from("tickets")
          .select("created_at")
          .in("event_id", eventIds)
          .gte("created_at", sixMonthsAgo)
      : Promise.resolve({ data: [] as { created_at: string }[], error: null }),
    supabase
      .from("tips")
      .select("amount_cents")
      .eq("artist_id", artistId)
      .gte("created_at", thirtyDaysAgo),
    supabase
      .from("vip_memberships")
      .select("id", { count: "exact", head: true })
      .eq("artist_id", artistId)
      .eq("active", true),
    supabase
      .from("events")
      .select("id, slug, title, scheduled_at, tour_stops(virtual_location_label)")
      .eq("artist_id", artistId)
      .in("status", ["scheduled", "live"])
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(5),
  ]);

  const orders = ordersRes.data ?? [];
  const tickets = ticketsRes.data ?? [];
  const tips = tipsRes.data ?? [];

  const revenueByMonth = new Map<string, number>();
  const ticketsByMonth = new Map<string, number>();
  for (const b of buckets) {
    revenueByMonth.set(b.key, 0);
    ticketsByMonth.set(b.key, 0);
  }

  for (const o of orders) {
    const key = format(startOfMonth(new Date(o.created_at as string)), "yyyy-MM");
    if (revenueByMonth.has(key)) {
      revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + (o.total_cents as number) / 100);
    }
  }

  for (const t of tickets) {
    const key = format(startOfMonth(new Date(t.created_at as string)), "yyyy-MM");
    if (ticketsByMonth.has(key)) {
      ticketsByMonth.set(key, (ticketsByMonth.get(key) ?? 0) + 1);
    }
  }

  const monthly: MonthlyMetric[] = buckets.map((b) => ({
    month: b.label,
    revenue: Math.round(revenueByMonth.get(b.key) ?? 0),
    tickets: ticketsByMonth.get(b.key) ?? 0,
  }));

  const revenue30d = orders
    .filter((o) => new Date(o.created_at as string) >= new Date(thirtyDaysAgo))
    .reduce((sum, o) => sum + (o.total_cents as number), 0);

  const tickets30d = tickets.filter(
    (t) => new Date(t.created_at as string) >= new Date(thirtyDaysAgo)
  ).length;

  const tips30d = tips.reduce((sum, t) => sum + (t.amount_cents as number), 0);

  const fanHeat = await getArtistFanHeatData(artistId, { region: "us", window: "all" });
  const heatPoints = fanHeat.points;
  const topLocations = fanHeat.topLocations.map((l) => ({ label: l.label, count: l.count }));

  const upcomingEvents = (upcomingRes.data ?? []).map((e) => {
    const stop = e.tour_stops as { virtual_location_label: string } | { virtual_location_label: string }[] | null;
    const label = Array.isArray(stop) ? stop[0]?.virtual_location_label : stop?.virtual_location_label;
    return {
      id: e.id as string,
      slug: e.slug as string,
      title: e.title as string,
      scheduledAt: e.scheduled_at as string,
      location: label ?? "Virtual",
    };
  });

  const followers = artistRow.data?.follower_count ?? 0;

  return {
    summary: {
      revenue30dLabel: formatCents(revenue30d),
      tickets30dLabel: String(tickets30d),
      tips30dLabel: formatCents(tips30d),
      vipMembersLabel: String(vipRes.count ?? 0),
      followersLabel: followers.toLocaleString(),
    },
    monthly,
    heatPoints,
    fanHeat,
    topLocations:
      topLocations.length > 0
        ? topLocations
        : [],
    upcomingEvents,
  };
}
