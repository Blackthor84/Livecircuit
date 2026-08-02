import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { format, startOfMonth, startOfYear, subMonths } from "date-fns";
import type {
  AgencyArtistIntelligenceRow,
  AgencyAssetsPayload,
  AgencyFinancePayload,
  AgencyFestivalDetail,
  AgencyFestivalRow,
  AgencyIntelligencePayload,
  AgencyMarketingPayload,
  AgencyOperationsPayload,
  AgencySponsorMatchRow,
} from "@/lib/agency/business-os-types";
import { getAgencyPromotionalCredits, normalizeAgencyPlan } from "@/lib/agency/partnership-program";
import type { AgencyRevenueReport } from "@/lib/agency/revenue-export";
import { getAgencyRevenueReport } from "@/lib/data/agency-features";

function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function getAgencyFinancePayload(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  periodDays = 365
): Promise<AgencyFinancePayload> {
  const report = (await getAgencyRevenueReport(orgId, userId, periodDays)) ?? emptyReport();

  const [payoutsRes, commissionsRes, invoicesRes, rulesRes, crmPaymentsRes, orgRes] = await Promise.all([
    supabase.from("agency_payouts").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50),
    supabase.from("agency_commissions").select("*").eq("organization_id", orgId).limit(50),
    supabase.from("agency_invoices").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50),
    supabase.from("agency_payout_rules").select("*").eq("organization_id", orgId),
    supabase.from("agency_crm_payments").select("*").eq("organization_id", orgId).in("status", ["pending", "overdue"]),
    supabase.from("agency_organizations").select("plan").eq("id", orgId).maybeSingle(),
  ]);

  const byArtist = aggregateBy(report.lines, (l) => l.artistName ?? "Unknown");
  const byEvent = aggregateBy(report.lines, (l) => l.performance ?? "Event");
  const byVenue = aggregateBy(report.lines, (l) => l.venue ?? "Digital");
  const byGenre = aggregateBy(report.lines, (l) => l.genre ?? "General");
  const bySponsor = [{ name: "Sponsorship", cents: report.totals.sponsorship }];

  const monthMap = new Map<string, { gross: number; net: number }>();
  for (const line of report.lines) {
    const entry = monthMap.get(line.month) ?? { gross: 0, net: 0 };
    entry.gross += line.grossCents;
    entry.net += line.netCents;
    monthMap.set(line.month, entry);
  }

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthlyLines = report.lines.filter((l) => {
    const d = parseMonthLabel(l.month);
    return d && d >= monthStart;
  });

  const pendingPayouts = (payoutsRes.data ?? []).filter((p) => p.status === "pending" || p.status === "processing");
  const completedPayouts = (payoutsRes.data ?? []).filter((p) => p.status === "paid");
  const outstanding = (crmPaymentsRes.data ?? []).reduce((s, p) => s + ((p.amount_cents as number) ?? 0), 0);

  const agencyShare = Math.round(report.totals.netCents * 0.15);
  const managerShare = Math.round(report.totals.netCents * 0.05);

  const defaultRule = (rulesRes.data ?? []).find((r) => r.is_default);
  const splits = (defaultRule?.splits as { role: string; percent: number }[]) ?? [
    { role: "artist", percent: 80 },
    { role: "agency", percent: 15 },
    { role: "manager", percent: 5 },
  ];

  return {
    overview: {
      monthlyRevenueCents: monthlyLines.reduce((s, l) => s + l.grossCents, 0),
      yearlyRevenueCents: report.totals.grossCents,
      grossRevenueCents: report.totals.grossCents,
      netRevenueCents: report.totals.netCents,
      platformFeesCents: report.totals.feesCents,
      agencyRevenueCents: agencyShare,
      managerRevenueCents: managerShare,
      projectedRevenueCents: Math.round(report.totals.netCents * 1.12),
      recurringRevenueCents: report.totals.subscriptions,
      outstandingPaymentsCents: outstanding,
      pendingPayoutsCents: pendingPayouts.reduce((s, p) => s + ((p.amount_cents as number) ?? 0), 0),
      completedPayoutsCents: completedPayouts.reduce((s, p) => s + ((p.amount_cents as number) ?? 0), 0),
      refundsCents: report.totals.refunds,
      taxEstimateCents: Math.round(report.totals.netCents * 0.25),
      cashFlowCents: report.totals.netCents - pendingPayouts.reduce((s, p) => s + ((p.amount_cents as number) ?? 0), 0),
    },
    byArtist: byArtist.slice(0, 15),
    byEvent: byEvent.slice(0, 15),
    byVenue: byVenue.slice(0, 10),
    byGenre: byGenre.slice(0, 10),
    bySponsor,
    streams: {
      ticketRevenueCents: report.lines.filter((l) => l.category === "Tickets").reduce((s, l) => s + l.grossCents, 0),
      vipRevenueCents: 0,
      backstagePassRevenueCents: 0,
      ppvRevenueCents: 0,
      subscriptionRevenueCents: report.totals.subscriptions,
    },
    trends: [...monthMap.entries()].map(([month, v]) => ({ month, grossCents: v.gross, netCents: v.net })),
    payouts: (payoutsRes.data ?? []) as AgencyFinancePayload["payouts"],
    commissions: (commissionsRes.data ?? []) as AgencyFinancePayload["commissions"],
    invoices: (invoicesRes.data ?? []) as AgencyFinancePayload["invoices"],
    payoutRules: ((rulesRes.data ?? []).length ? rulesRes.data : [{ id: "default", name: "Standard Split", splits, is_default: true }]) as AgencyFinancePayload["payoutRules"],
    profitLoss: [
      {
        label: "Agency Total",
        incomeCents: report.totals.grossCents,
        expensesCents: report.totals.feesCents + report.totals.refunds,
        netProfitCents: report.totals.netCents,
        marginPercent: report.totals.grossCents ? Math.round((report.totals.netCents / report.totals.grossCents) * 100) : 0,
      },
      ...byArtist.slice(0, 5).map((a) => ({
        label: a.name,
        incomeCents: a.cents,
        expensesCents: Math.round(a.cents * 0.1),
        netProfitCents: Math.round(a.cents * 0.9),
        marginPercent: 90,
      })),
    ],
  };
}

export async function getAgencyOperationsPayload(supabase: SupabaseClient, orgId: string): Promise<AgencyOperationsPayload> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

  const [tasksRes, approvalsRes, eventsRes, contractsRes, paymentsRes, membersRes] = await Promise.all([
    supabase.from("agency_crm_tasks").select("id, title, due_at, priority, status, owner_id").eq("organization_id", orgId).neq("status", "done").order("due_at").limit(50),
    supabase.from("agency_approval_requests").select("id, title, status, entity_type").eq("organization_id", orgId).not("status", "eq", "published").limit(20),
    supabase.from("agency_crm_bookings").select("id, title, starts_at").eq("organization_id", orgId).gte("starts_at", new Date().toISOString()).order("starts_at").limit(10),
    supabase.from("agency_crm_contracts").select("id, title, expires_at").not("expires_at", "is", null).lte("expires_at", new Date(Date.now() + 30 * 86400000).toISOString()).limit(10),
    supabase.from("agency_crm_payments").select("id, description, due_at, amount_cents").eq("organization_id", orgId).in("status", ["pending", "overdue"]).limit(10),
    supabase.from("agency_organization_members").select("user_id, profiles(display_name)").eq("organization_id", orgId),
  ]);

  const tasks = tasksRes.data ?? [];
  const todaysTasks = tasks.filter((t) => t.due_at && t.due_at >= todayStart && t.due_at <= todayEnd);

  const staffWorkload = (membersRes.data ?? []).map((m) => {
    const userId = m.user_id as string;
    const open = tasks.filter((t) => t.owner_id === userId);
    const overdue = open.filter((t) => t.due_at && t.due_at < new Date().toISOString());
    const profile = unwrapJoin(m.profiles as { display_name: string | null } | { display_name: string | null }[] | null);
    return { user_id: userId, name: profile?.display_name ?? "Staff", open_tasks: open.length, overdue_tasks: overdue.length };
  });

  return {
    todaysTasks: todaysTasks as AgencyOperationsPayload["todaysTasks"],
    approvalsNeeded: (approvalsRes.data ?? []) as AgencyOperationsPayload["approvalsNeeded"],
    upcomingEvents: (eventsRes.data ?? []).map((e) => ({ id: e.id as string, title: e.title as string, starts_at: e.starts_at as string })),
    contractExpirations: (contractsRes.data ?? []).map((c) => ({ id: c.id as string, title: c.title as string, expires_at: c.expires_at as string })),
    paymentDeadlines: (paymentsRes.data ?? []) as AgencyOperationsPayload["paymentDeadlines"],
    staffWorkload,
  };
}

export async function getAgencyMarketingPayload(supabase: SupabaseClient, orgId: string): Promise<AgencyMarketingPayload> {
  const [campaignsRes, countdownsRes, referralsRes, orgRes] = await Promise.all([
    supabase.from("agency_marketing_campaigns").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(30),
    supabase.from("agency_countdown_schedules").select("*").eq("organization_id", orgId).eq("active", true).limit(10),
    supabase.from("agency_referral_links").select("*").eq("organization_id", orgId).order("revenue_cents", { ascending: false }).limit(20),
    supabase.from("agency_organizations").select("plan").eq("id", orgId).maybeSingle(),
  ]);

  return {
    campaigns: (campaignsRes.data ?? []) as AgencyMarketingPayload["campaigns"],
    countdowns: (countdownsRes.data ?? []).map((c) => ({
      id: c.id as string,
      event_starts_at: c.event_starts_at as string,
      milestones: (c.milestones as { label: string; days_before: number }[]) ?? [],
    })),
    referrals: (referralsRes.data ?? []) as AgencyMarketingPayload["referrals"],
    creditBalanceCents: getAgencyPromotionalCredits(normalizeAgencyPlan(orgRes.data?.plan as string)),
    templates: MARKETING_TEMPLATES,
  };
}

const MARKETING_TEMPLATES = [
  { channel: "instagram", label: "Event announcement", preview: "🎤 [Artist] goes live at [Venue] — tickets on sale now." },
  { channel: "email", label: "Ticket launch", preview: "You're invited: [Event] — secure your spot before doors open." },
  { channel: "sms", label: "24-hour reminder", preview: "Tomorrow: [Artist] live on LiveCircuit." },
  { channel: "x", label: "Countdown", preview: "⏰ 7 days until [Artist] takes the digital stage." },
  { channel: "tiktok", label: "Hype caption", preview: "POV: your favorite artist just dropped a live show 🔥" },
  { channel: "linkedin", label: "Agency announcement", preview: "Proud to represent [Artist] on LiveCircuit." },
];

export async function computeAndGetAgencyIntelligence(supabase: SupabaseClient, orgId: string): Promise<AgencyIntelligencePayload> {
  const { data: roster } = await supabase
    .from("agency_managed_artists")
    .select("artist_id, artists(id, stage_name, follower_count)")
    .eq("organization_id", orgId)
    .eq("status", "active");

  const artists: AgencyArtistIntelligenceRow[] = [];
  const collaborations: AgencyIntelligencePayload["collaborations"] = [];

  for (const row of roster ?? []) {
    const artist = unwrapJoin(row.artists as { id: string; stage_name: string; follower_count: number } | { id: string; stage_name: string; follower_count: number }[] | null);
    if (!artist) continue;

    const followers = artist.follower_count ?? 0;
    const fanGrowth = Math.min(100, Math.round(Math.log10(followers + 10) * 20));
    const health = Math.min(100, 40 + fanGrowth);
    const rising = Math.min(100, Math.round(fanGrowth * 1.1));
    const recommendations = [
      fanGrowth < 50 ? "Run a promotion to boost follower growth" : "Consider booking larger venues",
      followers > 5000 ? "Increase ticket prices gradually" : "Perform more often to maintain momentum",
    ];

    artists.push({
      artist_id: artist.id,
      stage_name: artist.stage_name,
      fan_growth_score: fanGrowth,
      health_score: health,
      rising_star_score: rising,
      metrics: { followerGrowth: fanGrowth, ticketGrowth: Math.round(fanGrowth * 0.8), revenueGrowth: Math.round(fanGrowth * 0.7), attendanceGrowth: Math.round(fanGrowth * 0.85), engagement: Math.round(fanGrowth * 0.9), retention: Math.round(fanGrowth * 0.75) },
      recommendations,
      health: { audienceGrowth: fanGrowth, revenue: health, attendance: Math.round(health * 0.9), eventFrequency: 70, sponsorInterest: Math.round(fanGrowth * 0.6), marketingEffectiveness: 65, cancellationRate: 5 },
    });

    await supabase.from("agency_artist_intelligence").upsert({
      organization_id: orgId, artist_id: artist.id, fan_growth_score: fanGrowth, health_score: health, rising_star_score: rising,
      metrics: artists.at(-1)!.metrics, recommendations, computed_at: new Date().toISOString(),
    }, { onConflict: "organization_id,artist_id" });
  }

  for (let i = 0; i < artists.length; i++) {
    for (let j = i + 1; j < artists.length; j++) {
      const score = Math.round(100 - Math.abs(artists[i]!.fan_growth_score - artists[j]!.fan_growth_score));
      if (score >= 70) collaborations.push({ artist_a: artists[i]!.stage_name, artist_b: artists[j]!.stage_name, reason: "Similar audience size and growth trajectory", score });
    }
  }

  const avgScore = artists.length ? artists.reduce((s, a) => s + a.rising_star_score, 0) / artists.length : 50;
  const forecasts = [
    { period_label: format(subMonths(new Date(), -1), "MMM yyyy"), projected_cents: Math.round(avgScore * 10000), forecast_type: "revenue", risk_level: "low" },
    { period_label: format(subMonths(new Date(), -3), "Q yyyy"), projected_cents: Math.round(avgScore * 30000), forecast_type: "revenue", risk_level: "medium" },
    { period_label: "Next 90 days", projected_cents: Math.round(avgScore * 500), forecast_type: "attendance", risk_level: "low" },
  ];

  return { artists: artists.sort((a, b) => b.rising_star_score - a.rising_star_score), forecasts, collaborations: collaborations.slice(0, 10) };
}

export async function getAgencyAssetsPayload(supabase: SupabaseClient, orgId: string): Promise<AgencyAssetsPayload> {
  const [foldersRes, assetsRes, articlesRes] = await Promise.all([
    supabase.from("agency_asset_folders").select("*").eq("organization_id", orgId),
    supabase.from("agency_assets").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(100),
    supabase.from("agency_knowledge_articles").select("*").eq("organization_id", orgId).order("sort_order"),
  ]);

  return {
    folders: (foldersRes.data ?? []) as AgencyAssetsPayload["folders"],
    assets: (assetsRes.data ?? []) as AgencyAssetsPayload["assets"],
    articles: (articlesRes.data ?? []).length ? (articlesRes.data as AgencyAssetsPayload["articles"]) : DEFAULT_KNOWLEDGE,
  };
}

const DEFAULT_KNOWLEDGE = [
  { id: "playbook", title: "Booking Playbook", category: "playbooks", updated_at: new Date().toISOString() },
  { id: "sponsors", title: "Sponsor Outreach Guide", category: "sponsors", updated_at: new Date().toISOString() },
  { id: "marketing", title: "Marketing Campaign Guide", category: "marketing", updated_at: new Date().toISOString() },
];

export async function listAgencyFestivals(supabase: SupabaseClient, orgId: string): Promise<AgencyFestivalRow[]> {
  const { data } = await supabase.from("agency_festivals").select("*").eq("organization_id", orgId).order("starts_at", { ascending: false });
  return (data ?? []).map((f) => ({ id: f.id as string, name: f.name as string, slug: f.slug as string, status: f.status as string, starts_at: f.starts_at as string, ends_at: f.ends_at as string, artist_count: 0, pass_count: 0 }));
}

export async function getAgencyFestivalDetail(supabase: SupabaseClient, orgId: string, festivalId: string): Promise<AgencyFestivalDetail | null> {
  const { data: festival } = await supabase.from("agency_festivals").select("*").eq("organization_id", orgId).eq("id", festivalId).maybeSingle();
  if (!festival) return null;

  const [artistsRes, passesRes, sponsorsRes] = await Promise.all([
    supabase.from("agency_festival_artists").select("*, artists(stage_name), venues(name)").eq("festival_id", festivalId).order("sort_order"),
    supabase.from("agency_festival_passes").select("*").eq("festival_id", festivalId),
    supabase.from("agency_festival_sponsors").select("*").eq("festival_id", festivalId),
  ]);

  return {
    id: festival.id as string, name: festival.name as string, slug: festival.slug as string, status: festival.status as string,
    starts_at: festival.starts_at as string, ends_at: festival.ends_at as string, description: festival.description as string | null,
    branding: (festival.branding as Record<string, unknown>) ?? {}, artist_count: artistsRes.data?.length ?? 0, pass_count: passesRes.data?.length ?? 0,
    artists: (artistsRes.data ?? []).map((a) => ({
      artist_id: a.artist_id as string,
      stage_name: unwrapJoin(a.artists as { stage_name: string } | { stage_name: string }[] | null)?.stage_name ?? "Artist",
      venue_name: unwrapJoin(a.venues as { name: string } | { name: string }[] | null)?.name ?? null,
      slot_starts_at: a.slot_starts_at as string | null,
    })),
    passes: (passesRes.data ?? []) as AgencyFestivalDetail["passes"],
    sponsors: (sponsorsRes.data ?? []) as AgencyFestivalDetail["sponsors"],
  };
}

export async function listAgencySponsorMatches(supabase: SupabaseClient, orgId: string): Promise<AgencySponsorMatchRow[]> {
  const { data } = await supabase.from("agency_sponsor_matches").select("*, artists(stage_name), agency_crm_contacts(name)").eq("organization_id", orgId).order("match_score", { ascending: false }).limit(20);
  return (data ?? []).map((m) => ({
    id: m.id as string,
    artist_name: unwrapJoin(m.artists as { stage_name: string } | { stage_name: string }[] | null)?.stage_name ?? "Roster",
    sponsor_name: unwrapJoin(m.agency_crm_contacts as { name: string } | { name: string }[] | null)?.name ?? "Sponsor",
    match_score: m.match_score as number,
    reasons: (m.reasons as string[]) ?? [],
  }));
}

export { COUNTDOWN_MILESTONES, APPROVAL_STAGES } from "@/lib/agency/business-os-constants";

function aggregateBy(lines: AgencyRevenueReport["lines"], keyFn: (l: AgencyRevenueReport["lines"][0]) => string) {
  const map = new Map<string, number>();
  for (const line of lines) map.set(keyFn(line), (map.get(keyFn(line)) ?? 0) + line.grossCents);
  return [...map.entries()].map(([name, cents]) => ({ name, cents })).sort((a, b) => b.cents - a.cents);
}

function parseMonthLabel(label: string): Date | null {
  const d = new Date(label);
  return Number.isNaN(d.getTime()) ? null : d;
}

function emptyReport(): AgencyRevenueReport {
  return { orgName: "Agency", periodLabel: "Last 365 days", generatedAt: new Date().toLocaleString(), lines: [], totals: { grossCents: 0, feesCents: 0, netCents: 0, tickets: 0, subscriptions: 0, tips: 0, merchandise: 0, sponsorship: 0, advertising: 0, payouts: 0, refunds: 0 } };
}
