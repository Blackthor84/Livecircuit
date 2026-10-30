import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type PayoutConfig = {
  payoutDelayDays: number;
  minPayoutCents: number;
  maxPayoutCents: number | null;
  reservePercent: number;
};

export const DEFAULT_MIN_PAYOUT_CENTS = 2500;
export const DEFAULT_PAYOUT_DELAY_DAYS = 7;
export const DEFAULT_MANUAL_REVIEW_THRESHOLD_CENTS = 100_000;

const DEFAULT_HOLD_DAYS = DEFAULT_PAYOUT_DELAY_DAYS;

export async function getPayoutConfig(supabase: SupabaseClient): Promise<PayoutConfig> {
  const { data } = await supabase
    .from("monetization_payout_config")
    .select("payout_delay_days, min_payout_cents, max_payout_cents, reserve_percent")
    .eq("id", "default")
    .maybeSingle();

  return {
    payoutDelayDays: Number(data?.payout_delay_days ?? DEFAULT_HOLD_DAYS),
    minPayoutCents: Number(data?.min_payout_cents ?? DEFAULT_MIN_PAYOUT_CENTS),
    maxPayoutCents: data?.max_payout_cents != null ? Number(data.max_payout_cents) : null,
    reservePercent: Number(data?.reserve_percent ?? 0),
  };
}
