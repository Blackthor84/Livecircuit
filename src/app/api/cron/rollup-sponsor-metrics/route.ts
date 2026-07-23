import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { verifyCronRequest } from "@/lib/auth/cron";
import {
  rollupSponsorCampaignMetricsDaily,
  rollupSponsorMetricsRange,
} from "@/lib/services/cron/sponsor-metrics-rollup.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    if (!verifyCronRequest(request)) {
      return jsonError("Unauthorized", 401);
    }

    const url = new URL(request.url);
    const daysBack = Math.min(14, Math.max(1, Number(url.searchParams.get("days") ?? 1) || 1));
    const bucket = url.searchParams.get("bucket");

    if (bucket) {
      const result = await rollupSponsorCampaignMetricsDaily(bucket);
      if (!result.ok) return jsonError(result.error, 500);
      return NextResponse.json(result);
    }

    const results = await rollupSponsorMetricsRange(daysBack);
    const failed = results.filter((r) => !r.ok);
    if (failed.length === results.length) {
      return jsonError(failed[0]?.ok === false ? failed[0].error : "Rollup failed", 500);
    }

    return NextResponse.json({
      ok: true,
      daysBack,
      results,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function GET(request: Request) {
  return POST(request);
}
