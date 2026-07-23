import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import {
  aggregateRawAdMetrics,
  mergeDailySeries,
  type DailyMetricPoint,
} from "@/lib/services/sponsor-analytics.service";

export type SponsorAnalyticsReport = {
  organizationId: string;
  periodDays: number;
  summary: {
    impressions: number;
    clicks: number;
    ctr: number;
    uniqueVisitors: number;
    conversions: number;
    couponDownloads: number;
    avgSessionSeconds: number;
    revenueAttributionCents: number;
  };
  daily: DailyMetricPoint[];
  byCampaign: {
    campaignId: string;
    name: string;
    impressions: number;
    clicks: number;
  }[];
  geoDistribution: Record<string, number>;
  demographics: Record<string, unknown>;
  topEvents: { id: string; title: string; slug: string }[];
  topArtists: { id: string; stage_name: string; slug: string }[];
  growth: {
    impressionsDeltaPct: number | null;
    clicksDeltaPct: number | null;
  };
};

async function assertOrgAccess(organizationId: string, userId: string) {
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("sponsor_organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!membership && profile?.role !== "admin") return null;
  return supabase;
}

export async function getSponsorAnalyticsReport(
  organizationId: string,
  userId: string,
  periodDays = 30
): Promise<SponsorAnalyticsReport | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await assertOrgAccess(organizationId, userId);
  if (!supabase) return null;

  const since = new Date();
  since.setDate(since.getDate() - periodDays);
  const sinceIso = since.toISOString();
  const sinceDate = sinceIso.slice(0, 10);

  const { data: campaigns } = await supabase
    .from("sponsor_campaigns")
    .select("id, name")
    .eq("organization_id", organizationId);

  const campaignIds = (campaigns ?? []).map((c) => c.id as string);
  if (!campaignIds.length) {
    return emptyReport(organizationId, periodDays);
  }

  const { data: ads } = await supabase
    .from("advertisements")
    .select("id, campaign_id")
    .in("campaign_id", campaignIds);

  const adIds = (ads ?? []).map((a) => a.id as string);
  const adToCampaign = new Map((ads ?? []).map((a) => [a.id as string, a.campaign_id as string]));

  const { data: dailyRows } = await supabase
    .from("sponsor_campaign_metrics_daily")
    .select("*")
    .in("campaign_id", campaignIds)
    .gte("bucket_date", sinceDate);

  const storedDaily: DailyMetricPoint[] = [];
  let totalUnique = 0;
  let totalConversions = 0;
  let totalCouponDownloads = 0;
  let totalRevenue = 0;
  let totalSessionWeighted = 0;
  let sessionRows = 0;
  const geo: Record<string, number> = {};
  const demo: Record<string, unknown> = {};
  const eventIdCounts = new Map<string, number>();
  const artistIdCounts = new Map<string, number>();

  for (const row of dailyRows ?? []) {
    const date = row.bucket_date as string;
    storedDaily.push({
      date,
      impressions: Number(row.impressions),
      clicks: Number(row.clicks),
      conversions: Number(row.conversions),
      couponDownloads: Number(row.coupon_downloads),
    });
    totalUnique += row.unique_visitors as number;
    totalConversions += row.conversions as number;
    totalCouponDownloads += row.coupon_downloads as number;
    totalRevenue += row.revenue_attribution_cents as number;
    if ((row.avg_session_seconds as number) > 0) {
      totalSessionWeighted += row.avg_session_seconds as number;
      sessionRows += 1;
    }
    const g = row.geo_distribution as Record<string, number>;
    for (const [k, v] of Object.entries(g ?? {})) {
      geo[k] = (geo[k] ?? 0) + v;
    }
    Object.assign(demo, row.demographics as Record<string, unknown>);
    for (const eid of (row.top_event_ids as string[]) ?? []) {
      eventIdCounts.set(eid, (eventIdCounts.get(eid) ?? 0) + 1);
    }
    for (const aid of (row.top_artist_ids as string[]) ?? []) {
      artistIdCounts.set(aid, (artistIdCounts.get(aid) ?? 0) + 1);
    }
  }

  const rawDaily = await aggregateRawAdMetrics(supabase, adIds, sinceIso);
  const daily = mergeDailySeries(storedDaily, rawDaily);

  const { data: rawImpressions } = await supabase
    .from("advertisement_impressions")
    .select("user_id, session_id, advertisement_id")
    .in("advertisement_id", adIds.length ? adIds : ["00000000-0000-0000-0000-000000000000"])
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(5000);

  const uniqueKeys = new Set<string>();
  const campaignImpressions = new Map<string, number>();
  const campaignClicks = new Map<string, number>();

  for (const imp of rawImpressions ?? []) {
    const key = (imp.user_id as string) ?? (imp.session_id as string) ?? imp.advertisement_id;
    uniqueKeys.add(String(key));
    const cid = adToCampaign.get(imp.advertisement_id as string);
    if (cid) campaignImpressions.set(cid, (campaignImpressions.get(cid) ?? 0) + 1);
  }

  const { data: rawClicks } = await supabase
    .from("advertisement_clicks")
    .select("advertisement_id")
    .in("advertisement_id", adIds.length ? adIds : ["00000000-0000-0000-0000-000000000000"])
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(5000);

  for (const click of rawClicks ?? []) {
    const cid = adToCampaign.get(click.advertisement_id as string);
    if (cid) campaignClicks.set(cid, (campaignClicks.get(cid) ?? 0) + 1);
  }

  const totalImpressions = daily.reduce((s, d) => s + d.impressions, 0);
  const totalClicks = daily.reduce((s, d) => s + d.clicks, 0);

  if (!totalUnique && uniqueKeys.size) totalUnique = uniqueKeys.size;

  const { data: coupons } = await supabase
    .from("sponsor_coupons")
    .select("redemption_count, campaign_id")
    .in("campaign_id", campaignIds);

  const couponSum = (coupons ?? []).reduce((s, c) => s + (c.redemption_count as number), 0);
  if (couponSum > totalCouponDownloads) totalCouponDownloads = couponSum;

  const byCampaign = (campaigns ?? []).map((c) => ({
    campaignId: c.id as string,
    name: c.name as string,
    impressions: campaignImpressions.get(c.id as string) ?? 0,
    clicks: campaignClicks.get(c.id as string) ?? 0,
  }));

  const topEventIds = [...eventIdCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const topArtistIds = [...artistIdCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const [{ data: events }, { data: artists }] = await Promise.all([
    topEventIds.length
      ? supabase.from("events").select("id, title, slug").in("id", topEventIds)
      : Promise.resolve({ data: [] }),
    topArtistIds.length
      ? supabase.from("artists").select("id, stage_name, slug").in("id", topArtistIds)
      : Promise.resolve({ data: [] }),
  ]);

  const half = Math.floor(daily.length / 2);
  const firstHalf = daily.slice(0, half);
  const secondHalf = daily.slice(half);
  const impFirst = firstHalf.reduce((s, d) => s + d.impressions, 0);
  const impSecond = secondHalf.reduce((s, d) => s + d.impressions, 0);
  const clkFirst = firstHalf.reduce((s, d) => s + d.clicks, 0);
  const clkSecond = secondHalf.reduce((s, d) => s + d.clicks, 0);

  return {
    organizationId,
    periodDays,
    summary: {
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: totalImpressions ? totalClicks / totalImpressions : 0,
      uniqueVisitors: totalUnique,
      conversions: totalConversions,
      couponDownloads: totalCouponDownloads,
      avgSessionSeconds: sessionRows ? Math.round(totalSessionWeighted / sessionRows) : 0,
      revenueAttributionCents: totalRevenue,
    },
    daily,
    byCampaign,
    geoDistribution: geo,
    demographics: demo,
    topEvents: (events ?? []) as SponsorAnalyticsReport["topEvents"],
    topArtists: (artists ?? []) as SponsorAnalyticsReport["topArtists"],
    growth: {
      impressionsDeltaPct: pctChange(impFirst, impSecond),
      clicksDeltaPct: pctChange(clkFirst, clkSecond),
    },
  };
}

function pctChange(before: number, after: number): number | null {
  if (before === 0 && after === 0) return null;
  if (before === 0) return 100;
  return Math.round(((after - before) / before) * 1000) / 10;
}

function emptyReport(organizationId: string, periodDays: number): SponsorAnalyticsReport {
  return {
    organizationId,
    periodDays,
    summary: {
      impressions: 0,
      clicks: 0,
      ctr: 0,
      uniqueVisitors: 0,
      conversions: 0,
      couponDownloads: 0,
      avgSessionSeconds: 0,
      revenueAttributionCents: 0,
    },
    daily: [],
    byCampaign: [],
    geoDistribution: {},
    demographics: {},
    topEvents: [],
    topArtists: [],
    growth: { impressionsDeltaPct: null, clicksDeltaPct: null },
  };
}

export function sponsorAnalyticsToCsv(report: SponsorAnalyticsReport): string {
  const lines = [
    "LiveCircuit Sponsor Analytics Export",
    `Organization,${report.organizationId}`,
    `Period (days),${report.periodDays}`,
    "",
    "Summary Metric,Value",
    `Impressions,${report.summary.impressions}`,
    `Clicks,${report.summary.clicks}`,
    `CTR,${(report.summary.ctr * 100).toFixed(2)}%`,
    `Unique visitors,${report.summary.uniqueVisitors}`,
    `Conversions,${report.summary.conversions}`,
    `Coupon downloads,${report.summary.couponDownloads}`,
    `Avg session (sec),${report.summary.avgSessionSeconds}`,
    `Revenue attribution (cents),${report.summary.revenueAttributionCents}`,
    "",
    "Date,Impressions,Clicks",
    ...report.daily.map((d) => `${d.date},${d.impressions},${d.clicks}`),
    "",
    "Campaign,Impressions,Clicks",
    ...report.byCampaign.map((c) => `"${c.name}",${c.impressions},${c.clicks}`),
  ];
  return lines.join("\n");
}
