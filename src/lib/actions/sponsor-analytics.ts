"use server";

import { getSessionUser } from "@/lib/auth/session";
import {
  getSponsorAnalyticsReport,
  sponsorAnalyticsToCsv,
} from "@/lib/data/sponsor-analytics";

export type SponsorAnalyticsActionResult =
  | { ok: true; csv: string; filename: string }
  | { ok: false; error: string };

export async function exportSponsorAnalyticsCsvAction(input: {
  organizationId: string;
  periodDays?: number;
}): Promise<SponsorAnalyticsActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const periodDays = input.periodDays ?? 30;
  const report = await getSponsorAnalyticsReport(input.organizationId, user.id, periodDays);
  if (!report) return { ok: false, error: "Access denied or no data" };

  const csv = sponsorAnalyticsToCsv(report);
  const filename = `livecircuit-sponsor-analytics-${periodDays}d-${new Date().toISOString().slice(0, 10)}.csv`;

  return { ok: true, csv, filename };
}

export async function recordAdvertisementImpressionAction(input: {
  advertisementId: string;
  billboardId?: string;
  venueId?: string;
  sessionId?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSessionUser();
  const { createClient } = await import("@/lib/supabase/server");
  const { isSupabaseConfigured } = await import("@/lib/config/env");

  if (!isSupabaseConfigured()) return { ok: false, error: "Unavailable" };

  const supabase = await createClient();
  const { error } = await supabase.from("advertisement_impressions").insert({
    advertisement_id: input.advertisementId,
    billboard_id: input.billboardId ?? null,
    venue_id: input.venueId ?? null,
    user_id: user?.id ?? null,
    session_id: input.sessionId ?? null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
