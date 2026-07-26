import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { getMilestoneEnvStatus } from "@/lib/config/env";
import { countActiveObservers } from "@/lib/auth/observer";
import { getAdminDashboardData } from "@/lib/data/admin";

export type MetricStatus = "live" | "todo" | "partial";

export type AdminKpi = {
  label: string;
  value: string;
  hint?: string;
  status?: MetricStatus;
};

export type AdminTrendPoint = {
  label: string;
  value: number;
};

export type AdminPlatformOverview = {
  kpis: AdminKpi[];
  health: ReturnType<typeof getMilestoneEnvStatus>;
  queues: {
    pendingVerifications: number;
    openReports: number;
    paidOrders: number;
  };
  signupTrend: AdminTrendPoint[];
  revenueTrend: AdminTrendPoint[];
  engagementTrend: AdminTrendPoint[];
  todos: string[];
};

function monthKey(date: Date) {
  return date.toLocaleString("en-US", { month: "short", year: "2-digit" });
}

function lastMonths(count: number) {
  const months: Date[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  }
  return months;
}

export async function getAdminPlatformOverview(): Promise<AdminPlatformOverview> {
  const health = getMilestoneEnvStatus();
  const todos = [
    "Watch time aggregation pipeline not wired — requires session telemetry in analytics_events.",
    "Retention cohorts require scheduled rollup job — schema exists, ETL pending.",
    "Growth rate uses signup counts only until marketing attribution is connected.",
  ];

  if (!isSupabaseConfigured()) {
    return {
      kpis: [
        { label: "Total users", value: "—", status: "todo", hint: "Connect Supabase" },
        { label: "Live concurrent viewers", value: "—", status: "todo" },
        { label: "Ticket sales (30d)", value: "—", status: "todo" },
        { label: "Platform GMV (30d)", value: "—", status: "todo" },
      ],
      health,
      queues: { pendingVerifications: 0, openReports: 0, paidOrders: 0 },
      signupTrend: [],
      revenueTrend: [],
      engagementTrend: [],
      todos,
    };
  }

  const supabase = await createClient();
  const months = lastMonths(6);

  const sinceToday = new Date();
  sinceToday.setHours(0, 0, 0, 0);
  const sinceTodayIso = sinceToday.toISOString();

  const [
    profilesRes,
    artistsRes,
    liveEventsRes,
    upcomingEventsRes,
    venuesRes,
    toursRes,
    followersRes,
    messagesTodayRes,
    observersRes,
    profilesRecentRes,
    ordersRecentRes,
    ticketsRecentRes,
    chatRecentRes,
    queueData,
    entityCounts,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("artists").select("id", { count: "exact", head: true }),
    supabase.from("events").select("viewer_count").eq("status", "live"),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
    supabase.from("venues").select("id", { count: "exact", head: true }),
    supabase.from("tours").select("id", { count: "exact", head: true }),
    supabase.from("followers").select("id", { count: "exact", head: true }),
    supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("is_deleted", false)
      .gte("created_at", sinceTodayIso),
    countActiveObservers(),
    supabase.from("profiles").select("created_at").gte("created_at", months[0]!.toISOString()),
    supabase
      .from("orders")
      .select("created_at, total_cents")
      .eq("status", "paid")
      .gte("created_at", months[0]!.toISOString()),
    supabase.from("tickets").select("created_at").gte("created_at", months[0]!.toISOString()),
    supabase
      .from("chat_messages")
      .select("created_at")
      .eq("is_deleted", false)
      .gte("created_at", months[0]!.toISOString()),
    getAdminDashboardData(),
    getAdminEntityCounts(),
  ]);

  const concurrentViewers = (liveEventsRes.data ?? []).reduce(
    (sum, row) => sum + ((row.viewer_count as number) ?? 0),
    0
  );

  const bucket = (rows: { created_at: string }[], valueFn?: (row: { created_at: string }) => number) => {
    const map = new Map<string, number>();
    for (const month of months) map.set(monthKey(month), 0);
    for (const row of rows) {
      const key = monthKey(new Date(row.created_at));
      if (!map.has(key)) continue;
      map.set(key, (map.get(key) ?? 0) + (valueFn ? valueFn(row) : 1));
    }
    return months.map((month) => ({ label: monthKey(month), value: map.get(monthKey(month)) ?? 0 }));
  };

  const revenueTrend = (() => {
    const map = new Map<string, number>();
    for (const month of months) map.set(monthKey(month), 0);
    for (const row of ordersRecentRes.data ?? []) {
      const key = monthKey(new Date(row.created_at as string));
      if (!map.has(key)) continue;
      map.set(key, (map.get(key) ?? 0) + Math.round((row.total_cents as number) / 100));
    }
    return months.map((month) => ({ label: monthKey(month), value: map.get(monthKey(month)) ?? 0 }));
  })();

  const engagementTrend = months.map((month) => {
    const key = monthKey(month);
    const chat = (chatRecentRes.data ?? []).filter(
      (row) => monthKey(new Date(row.created_at as string)) === key
    ).length;
    const tickets = (ticketsRecentRes.data ?? []).filter(
      (row) => monthKey(new Date(row.created_at as string)) === key
    ).length;
    return { label: key, value: chat + tickets };
  });

  const signupTrend = bucket(profilesRecentRes.data ?? []);
  const latestSignup = signupTrend.at(-1)?.value ?? 0;
  const previousSignup = signupTrend.at(-2)?.value ?? 0;
  const growthPct =
    previousSignup > 0
      ? `${Math.round(((latestSignup - previousSignup) / previousSignup) * 100)}%`
      : latestSignup > 0
        ? "New"
        : "0%";

  return {
    kpis: [
      { label: "Total Users", value: String(profilesRes.count ?? 0) },
      { label: "Users Online", value: String(concurrentViewers + observersRes) },
      { label: "Artists", value: String(artistsRes.count ?? 0) },
      { label: "Live Events", value: String(entityCounts.liveEvents) },
      { label: "Upcoming Events", value: String(upcomingEventsRes.count ?? 0) },
      { label: "Venues", value: String(venuesRes.count ?? 0) },
      { label: "Tours", value: String(toursRes.count ?? 0) },
      { label: "Followers", value: String(followersRes.count ?? 0) },
      { label: "Messages Today", value: String(messagesTodayRes.count ?? 0) },
      { label: "Reports", value: String(queueData.reports.length) },
      {
        label: "Average Watch Time",
        value: "Pipeline pending",
        status: "todo",
        hint: "Wire analytics_events session_duration",
      },
      { label: "Growth", value: growthPct, hint: "Month-over-month signups" },
    ],
    health,
    queues: {
      pendingVerifications: queueData.verifications.length,
      openReports: queueData.reports.length,
      paidOrders: queueData.orders.length,
    },
    signupTrend,
    revenueTrend,
    engagementTrend,
    todos,
  };
}

export async function getAdminOverviewKpis(): Promise<AdminKpi[]> {
  if (!isSupabaseConfigured()) {
    return [
      { label: "Total Users", value: "—", status: "todo", hint: "Connect Supabase" },
      { label: "Users Online", value: "—", status: "todo" },
      { label: "Artists", value: "—", status: "todo" },
      { label: "Live Events", value: "—", status: "todo" },
      { label: "Current Viewers", value: "—", status: "todo" },
      { label: "Venues", value: "—", status: "todo" },
      { label: "Tours", value: "—", status: "todo" },
      { label: "Messages Today", value: "—", status: "todo" },
      { label: "Reports Waiting", value: "—", status: "todo" },
    ];
  }

  const supabase = await createClient();
  const sinceToday = new Date();
  sinceToday.setHours(0, 0, 0, 0);

  const [profilesRes, artistsRes, liveEventsRes, venuesRes, toursRes, messagesTodayRes, queueData, observersRes] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("artists").select("id", { count: "exact", head: true }),
      supabase.from("events").select("viewer_count").eq("status", "live"),
      supabase.from("venues").select("id", { count: "exact", head: true }),
      supabase.from("tours").select("id", { count: "exact", head: true }),
      supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("is_deleted", false)
        .gte("created_at", sinceToday.toISOString()),
      getAdminDashboardData(),
      countActiveObservers(),
    ]);

  const liveEvents = liveEventsRes.data ?? [];
  const currentViewers = liveEvents.reduce((sum, row) => sum + ((row.viewer_count as number) ?? 0), 0);
  const usersOnline = currentViewers + observersRes;

  return [
    { label: "Total Users", value: String(profilesRes.count ?? 0) },
    { label: "Users Online", value: String(usersOnline), hint: "Live viewers + observers" },
    { label: "Artists", value: String(artistsRes.count ?? 0) },
    { label: "Live Events", value: String(liveEvents.length) },
    { label: "Current Viewers", value: String(currentViewers) },
    { label: "Venues", value: String(venuesRes.count ?? 0) },
    { label: "Tours", value: String(toursRes.count ?? 0) },
    { label: "Messages Today", value: String(messagesTodayRes.count ?? 0) },
    { label: "Reports Waiting", value: String(queueData.reports.length) },
  ];
}

export async function getAdminEntityCounts() {
  if (!isSupabaseConfigured()) {
    return {
      venues: 0,
      events: 0,
      tours: 0,
      genres: 0,
      sponsorOrgs: 0,
      liveEvents: 0,
    };
  }

  const supabase = await createClient();
  const [venues, events, tours, genres, sponsors, liveEvents] = await Promise.all([
    supabase.from("venues").select("id", { count: "exact", head: true }),
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("tours").select("id", { count: "exact", head: true }),
    supabase.from("genres").select("id", { count: "exact", head: true }),
    supabase.from("sponsor_organizations").select("id", { count: "exact", head: true }),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "live"),
  ]);

  return {
    venues: venues.count ?? 0,
    events: events.count ?? 0,
    tours: tours.count ?? 0,
    genres: genres.count ?? 0,
    sponsorOrgs: sponsors.count ?? 0,
    liveEvents: liveEvents.count ?? 0,
  };
}
