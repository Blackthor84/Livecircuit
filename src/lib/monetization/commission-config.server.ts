import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MonetizationCommissionConfig } from "@/lib/monetization/types";

export const DEFAULT_TICKET_COMMISSION_PERCENT = 10;
export const DEFAULT_PRIVATE_BOOKING_COMMISSION_PERCENT = 10;

export function mapCommissionRow(row: Record<string, unknown> | null): MonetizationCommissionConfig {
  const r = row ?? {};
  return {
    ticketCommissionPercent: Number(r.ticket_commission_percent ?? DEFAULT_TICKET_COMMISSION_PERCENT),
    privateBookingCommissionPercent: Number(
      r.private_booking_commission_percent ?? DEFAULT_PRIVATE_BOOKING_COMMISSION_PERCENT,
    ),
    updatedAt: (r.updated_at as string) ?? null,
  };
}

export function emptyCommissionConfig(): MonetizationCommissionConfig {
  return {
    ticketCommissionPercent: DEFAULT_TICKET_COMMISSION_PERCENT,
    privateBookingCommissionPercent: DEFAULT_PRIVATE_BOOKING_COMMISSION_PERCENT,
    updatedAt: null,
  };
}

export async function getCommissionConfig(supabase: SupabaseClient): Promise<MonetizationCommissionConfig> {
  const { data } = await supabase
    .from("monetization_commission_config")
    .select("ticket_commission_percent, private_booking_commission_percent, updated_at")
    .eq("id", "default")
    .maybeSingle();

  return mapCommissionRow(data as Record<string, unknown> | null);
}

/** Ticket checkout uses commission as live source; ticket_config.platform_fee_percent is kept in sync for admin mirrors. */
export function ticketPlatformFeePercentFromCommission(
  commission: MonetizationCommissionConfig,
  ticketPlatformFeePercentFallback: number,
): number {
  const pct = commission.ticketCommissionPercent;
  if (Number.isFinite(pct) && pct >= 0 && pct <= 100) return pct;
  return ticketPlatformFeePercentFallback;
}
