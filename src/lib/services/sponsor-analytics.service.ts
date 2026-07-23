import type { SupabaseClient } from "@supabase/supabase-js";

export type DailyMetricPoint = {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  couponDownloads: number;
};

function toDateKey(iso: string) {
  return iso.slice(0, 10);
}

export const MAX_RAW_IMPRESSION_ROWS = 5000;

export async function aggregateRawAdMetrics(
  supabase: SupabaseClient,
  advertisementIds: string[],
  sinceIso: string
): Promise<DailyMetricPoint[]> {
  if (!advertisementIds.length) return [];

  const { data: impressions } = await supabase
    .from("advertisement_impressions")
    .select("created_at, advertisement_id")
    .in("advertisement_id", advertisementIds)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(MAX_RAW_IMPRESSION_ROWS);

  const { data: clicks } = await supabase
    .from("advertisement_clicks")
    .select("created_at, advertisement_id")
    .in("advertisement_id", advertisementIds)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(MAX_RAW_IMPRESSION_ROWS);

  const byDate = new Map<string, DailyMetricPoint>();

  for (const row of impressions ?? []) {
    const key = toDateKey(row.created_at as string);
    const cur = byDate.get(key) ?? {
      date: key,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      couponDownloads: 0,
    };
    cur.impressions += 1;
    byDate.set(key, cur);
  }

  for (const row of clicks ?? []) {
    const key = toDateKey(row.created_at as string);
    const cur = byDate.get(key) ?? {
      date: key,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      couponDownloads: 0,
    };
    cur.clicks += 1;
    byDate.set(key, cur);
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function upsertCampaignMetricsDaily(
  supabase: SupabaseClient,
  campaignId: string,
  bucketDate: string,
  patch: Partial<{
    impressions: number;
    clicks: number;
    unique_visitors: number;
    coupon_downloads: number;
  }>
) {
  const { data: existing } = await supabase
    .from("sponsor_campaign_metrics_daily")
    .select("id, impressions, clicks, unique_visitors, coupon_downloads")
    .eq("campaign_id", campaignId)
    .eq("bucket_date", bucketDate)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("sponsor_campaign_metrics_daily")
      .update({
        impressions: (existing.impressions as number) + (patch.impressions ?? 0),
        clicks: (existing.clicks as number) + (patch.clicks ?? 0),
        unique_visitors: patch.unique_visitors ?? existing.unique_visitors,
        coupon_downloads: (existing.coupon_downloads as number) + (patch.coupon_downloads ?? 0),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("sponsor_campaign_metrics_daily").insert({
      campaign_id: campaignId,
      bucket_date: bucketDate,
      impressions: patch.impressions ?? 0,
      clicks: patch.clicks ?? 0,
      unique_visitors: patch.unique_visitors ?? 0,
      coupon_downloads: patch.coupon_downloads ?? 0,
    });
  }
}

export function mergeDailySeries(
  stored: DailyMetricPoint[],
  raw: DailyMetricPoint[]
): DailyMetricPoint[] {
  const map = new Map<string, DailyMetricPoint>();
  for (const row of stored) {
    map.set(row.date, { ...row });
  }
  for (const row of raw) {
    const cur = map.get(row.date);
    if (!cur) {
      map.set(row.date, { ...row });
    } else {
      cur.impressions = Math.max(cur.impressions, row.impressions);
      cur.clicks = Math.max(cur.clicks, row.clicks);
    }
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}
