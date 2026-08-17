import { proportionalTicketRefundSplit } from "@/lib/monetization/ticket-revenue-split";

export type DisputeReversalInput = {
  chargeAmountCents: number;
  transferAmountCents: number;
  disputeAmountCents: number;
  grossCents: number;
  platformFeeCents: number;
  artistEarningsCents: number;
  /** Cumulative refund_cents already applied to the order. */
  priorRefundCents: number;
  /** Sum of artist-side dispute transfer reversals already applied for this order. */
  priorDisputeReversalCents: number;
};

/**
 * Maximum Stripe transfer reversal for a dispute on a destination charge.
 * Never exceeds the artist's remaining economic exposure (not the gross transfer).
 */
export function calculateDisputeTransferReversalAmount(input: DisputeReversalInput): number {
  if (input.disputeAmountCents <= 0 || input.chargeAmountCents <= 0) {
    return 0;
  }

  const { artistReversalCents: priorRefundArtistReversal } = proportionalTicketRefundSplit({
    grossCents: input.grossCents,
    platformFeeCents: input.platformFeeCents,
    artistEarningsCents: input.artistEarningsCents,
    refundCents: input.priorRefundCents,
  });

  const remainingArtistExposure = Math.max(
    0,
    input.artistEarningsCents - priorRefundArtistReversal - input.priorDisputeReversalCents,
  );

  if (remainingArtistExposure <= 0) {
    return 0;
  }

  const { artistReversalCents: disputeArtistShare } = proportionalTicketRefundSplit({
    grossCents: input.grossCents,
    platformFeeCents: input.platformFeeCents,
    artistEarningsCents: input.artistEarningsCents,
    refundCents: input.disputeAmountCents,
  });

  const transferProportional = Math.round(
    (input.transferAmountCents * input.disputeAmountCents) / input.chargeAmountCents,
  );

  return Math.max(
    0,
    Math.min(transferProportional, disputeArtistShare, remainingArtistExposure),
  );
}

export function sumPriorDisputeReversalCents(
  rows: Array<{ metadata?: Record<string, unknown> | null; stripe_transfer_reversal_id?: string | null }>,
): number {
  return rows.reduce((sum, row) => {
    if (!row.stripe_transfer_reversal_id) return sum;
    const cents = row.metadata?.reversal_amount_cents;
    return sum + (typeof cents === "number" ? cents : 0);
  }, 0);
}
