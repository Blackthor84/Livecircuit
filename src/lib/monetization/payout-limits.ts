import type { PayoutConfig } from "@/lib/monetization/payout-config.server";

/** Spendable Connect balance for a single payout attempt after reserve and max caps. */
export function computeArtistPayoutSpendableCents(
  availableCents: number,
  config: Pick<PayoutConfig, "maxPayoutCents" | "reservePercent">,
): number {
  let amount = Math.max(0, availableCents);
  if (config.reservePercent > 0) {
    const reserve = Math.floor(availableCents * (config.reservePercent / 100));
    amount = Math.max(0, amount - reserve);
  }
  if (config.maxPayoutCents != null && config.maxPayoutCents > 0) {
    amount = Math.min(amount, config.maxPayoutCents);
  }
  return amount;
}
