/** Pure ticket revenue split helpers — locked to orders at checkout creation. */

export const DEFAULT_PLATFORM_TICKET_FEE_PERCENT = 10;
export const DEFAULT_ARTIST_TICKET_SHARE_PERCENT = 90;

export type TicketRevenueSplit = {
  grossCents: number;
  platformFeeCents: number;
  artistEarningsCents: number;
  platformFeePercent: number;
  artistSharePercent: number;
};

export function calculateArtistTicketRevenueSplit(input: {
  ticketSubtotalCents: number;
  discountCents?: number;
  /** Locked at checkout — never recalculate from live config after order creation. */
  platformFeePercent?: number;
}): TicketRevenueSplit {
  const grossCents = Math.max(0, input.ticketSubtotalCents - (input.discountCents ?? 0));
  const platformFeePercent = input.platformFeePercent ?? DEFAULT_PLATFORM_TICKET_FEE_PERCENT;
  const platformFeeCents = Math.round(grossCents * (platformFeePercent / 100));
  const artistEarningsCents = grossCents - platformFeeCents;

  return {
    grossCents,
    platformFeeCents,
    artistEarningsCents,
    platformFeePercent,
    artistSharePercent: 100 - platformFeePercent,
  };
}

export function isPaidArtistTicketCheckout(input: {
  orderType: string;
  unitAmountCents: number;
  artistId: string | null;
}): boolean {
  return input.orderType === "ticket" && input.unitAmountCents > 0 && Boolean(input.artistId);
}

export function proportionalTicketRefundSplit(input: {
  grossCents: number;
  platformFeeCents: number;
  artistEarningsCents: number;
  refundCents: number;
}): { platformReversalCents: number; artistReversalCents: number; fullRefund: boolean } {
  const fullRefund = input.refundCents >= input.grossCents;
  if (fullRefund || input.grossCents <= 0) {
    return {
      platformReversalCents: input.platformFeeCents,
      artistReversalCents: input.artistEarningsCents,
      fullRefund: true,
    };
  }

  const platformReversalCents = Math.round(
    (input.platformFeeCents * input.refundCents) / input.grossCents,
  );
  const artistReversalCents = Math.round(
    (input.artistEarningsCents * input.refundCents) / input.grossCents,
  );

  return { platformReversalCents, artistReversalCents, fullRefund: false };
}
