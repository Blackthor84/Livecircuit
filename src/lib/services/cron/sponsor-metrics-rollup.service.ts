import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type RollupResult =
  | { ok: true; bucketDate: string; rowsUpserted: number }
  | { ok: false; error: string };

function toBucketDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function rollupSponsorCampaignMetricsDaily(
  bucketDate?: string
): Promise<RollupResult> {
  const bucket = bucketDate ?? toBucketDate(new Date(Date.now() - 86_400_000));

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.rpc("rollup_sponsor_campaign_metrics_daily", {
      p_bucket: bucket,
    });

    if (error) return { ok: false, error: error.message };

    return {
      ok: true,
      bucketDate: bucket,
      rowsUpserted: typeof data === "number" ? data : Number(data ?? 0),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Rollup failed" };
  }
}

export async function rollupSponsorMetricsRange(daysBack: number): Promise<RollupResult[]> {
  const results: RollupResult[] = [];
  for (let i = 1; i <= daysBack; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    results.push(await rollupSponsorCampaignMetricsDaily(toBucketDate(d)));
  }
  return results;
}
