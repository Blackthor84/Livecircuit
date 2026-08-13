import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  configureArtistManualPayouts,
  getArtistConnectAccount,
  mapStripeAccountToConnectFields,
  persistArtistConnectFields,
} from "@/lib/stripe/connect";

export type ConnectPayoutSyncResult = {
  dryRun: boolean;
  scanned: number;
  updated: number;
  skipped: number;
  failed: number;
  details: Array<{
    artistId: string;
    stripeAccountId: string;
    action: "updated" | "skipped" | "failed";
    previousSchedule: string | null;
    message?: string;
  }>;
};

export async function syncExistingArtistPayoutSchedules(
  supabase: SupabaseClient,
  options?: { dryRun?: boolean; artistId?: string },
): Promise<ConnectPayoutSyncResult> {
  const dryRun = options?.dryRun ?? true;
  const result: ConnectPayoutSyncResult = {
    dryRun,
    scanned: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  let query = supabase
    .from("artists")
    .select(
      "id, stripe_account_id, stripe_payouts_manual, stripe_payouts_schedule, stripe_payouts_enabled, stripe_charges_enabled",
    )
    .not("stripe_account_id", "is", null);

  if (options?.artistId) query = query.eq("id", options.artistId);

  const { data: artists } = await query;

  for (const artist of artists ?? []) {
    const artistId = artist.id as string;
    const stripeAccountId = artist.stripe_account_id as string;
    result.scanned += 1;

    try {
      const account = await getArtistConnectAccount(stripeAccountId);
      const interval = account.settings?.payouts?.schedule?.interval ?? null;
      const mapped = mapStripeAccountToConnectFields(account);

      if (!account.payouts_enabled) {
        result.skipped += 1;
        result.details.push({
          artistId,
          stripeAccountId,
          action: "skipped",
          previousSchedule: interval,
          message: "Payouts not enabled on Stripe account",
        });
        if (!dryRun) {
          await persistArtistConnectFields(supabase, artistId, mapped);
        }
        continue;
      }

      if (interval === "manual" && artist.stripe_payouts_manual) {
        result.skipped += 1;
        result.details.push({
          artistId,
          stripeAccountId,
          action: "skipped",
          previousSchedule: interval,
          message: "Already manual",
        });
        continue;
      }

      if (dryRun) {
        result.updated += 1;
        result.details.push({
          artistId,
          stripeAccountId,
          action: "updated",
          previousSchedule: interval,
          message: "Would configure manual payouts",
        });
        continue;
      }

      await configureArtistManualPayouts(stripeAccountId);
      const refreshed = await getArtistConnectAccount(stripeAccountId);
      const refreshedMapped = mapStripeAccountToConnectFields(refreshed);
      await persistArtistConnectFields(supabase, artistId, refreshedMapped);

      result.updated += 1;
      result.details.push({
        artistId,
        stripeAccountId,
        action: "updated",
        previousSchedule: interval,
        message: "Configured manual payouts",
      });
    } catch (e) {
      result.failed += 1;
      result.details.push({
        artistId,
        stripeAccountId,
        action: "failed",
        previousSchedule: null,
        message: e instanceof Error ? e.message : "Sync failed",
      });
    }
  }

  return result;
}
