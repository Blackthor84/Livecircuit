import type { MonetizationSnapshot } from "@/lib/monetization/types";
import { calculateArtistTicketRevenueSplit } from "@/lib/monetization/ticket-revenue-split";
import { ticketPricingFromSnapshot } from "@/lib/monetization/pricing-utils";

/** Display-only config derived from the live monetization snapshot — not used for checkout/payout math. */
export type ArtistEarningsDisplayConfig = {
  platformFeePercent: number;
  platformFeeLabel: string;
  payoutDelayDays: number;
  minPayoutCents: number;
  reservePercent: number;
  stripeConnectReady: boolean;
  paymentProcessingDescription: string;
};

export function buildArtistEarningsDisplayConfig(
  snapshot: MonetizationSnapshot,
): ArtistEarningsDisplayConfig {
  const ticket = ticketPricingFromSnapshot(snapshot);
  return {
    platformFeePercent: ticket.platformFeePercentage,
    platformFeeLabel: ticket.platformFeeLabel,
    payoutDelayDays: snapshot.payouts.payoutDelayDays,
    minPayoutCents: snapshot.payouts.minPayoutCents,
    reservePercent: snapshot.payouts.reservePercent,
    stripeConnectReady: snapshot.payouts.stripeConnectReady,
    paymentProcessingDescription: ticket.paymentProcessingDescription,
  };
}

export function formatUsdFromCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function formatPayoutDelayDays(days: number): string {
  return days === 1 ? "1 day" : `${days} days`;
}

/** Order-level payout statuses (`orders.artist_payout_status`). */
export const ORDER_PAYOUT_STATUS_DEFINITIONS = [
  {
    status: "pending",
    label: "Pending",
    description:
      "Your earnings have been recorded but are not yet eligible for payout. LiveCircuit holds ticket earnings for the configured payout eligibility period before they can become available.",
  },
  {
    status: "available",
    label: "Available",
    description:
      "Your earnings are eligible for payout once the applicable payout requirements are satisfied, including minimum payout amount and Stripe Connect settlement.",
  },
  {
    status: "paid",
    label: "Paid",
    description: "These earnings were included in a completed payout to your connected account.",
  },
  {
    status: "processing",
    label: "Processing",
    description:
      "Your payout has been initiated and is being processed through Stripe. This status applies to payout records while funds move to your bank.",
  },
  {
    status: "held",
    label: "Held",
    description:
      "Your earnings are temporarily being held because of a dispute, refund, or other financial condition affecting the order.",
  },
  {
    status: "refunded",
    label: "Refunded",
    description: "The ticket order was fully refunded and artist earnings were reversed.",
  },
  {
    status: "partially_refunded",
    label: "Partially refunded",
    description: "Part of the ticket order was refunded and remaining artist earnings were adjusted proportionally.",
  },
  {
    status: "failed",
    label: "Failed",
    description: "Payout processing for these earnings did not complete successfully. LiveCircuit or Stripe may require additional action.",
  },
] as const;

export const PAYOUT_FLOW_STEPS = [
  { title: "Fan purchases ticket", subtitle: "The fan completes the purchase." },
  { title: "Payment processed", subtitle: "Stripe confirms the payment and LiveCircuit records the transaction." },
  {
    title: "Pending",
    subtitle:
      "Your earnings are held during the applicable payout eligibility and settlement period before they can become available.",
  },
  {
    title: "Available",
    subtitle:
      "Once eligibility and settlement requirements are satisfied, your earnings can become available for payout.",
  },
  { title: "Payout initiated", subtitle: "LiveCircuit sends the eligible payout through Stripe." },
  {
    title: "Bank processing",
    subtitle:
      "After the payout is initiated, additional processing time may be required by Stripe and your financial institution.",
  },
  { title: "Paid", subtitle: "The payout has been successfully processed." },
] as const;

export const EARNINGS_FLOW_STEPS = [
  "Fan purchases ticket",
  "Payment processed",
  "LiveCircuit calculates artist earnings",
  "Funds become payout-eligible",
  "LiveCircuit initiates payout",
  "Bank processing",
  "Artist receives funds",
] as const;

/** Reasons aligned with `artist-payout.service.ts` eligibility checks and order hold behavior. */
export function buildPayoutDelayReasons(config: ArtistEarningsDisplayConfig) {
  return [
    {
      title: "Payout eligibility period",
      body: `Ticket earnings may remain pending for up to ${formatPayoutDelayDays(config.payoutDelayDays)} after payment before LiveCircuit releases them to your available balance.`,
    },
    {
      title: "Stripe payment settlement",
      body: "Even after earnings are available in LiveCircuit, Stripe must settle funds on your connected account before a payout can be sent. LiveCircuit checks Stripe's available balance before initiating payout.",
    },
    {
      title: "Minimum payout amount",
      body: `Your available earnings must meet the current minimum payout requirement (${formatUsdFromCents(config.minPayoutCents)}) before LiveCircuit can initiate a payout.`,
    },
    {
      title: "Dispute or refund hold",
      body: "A dispute, chargeback, or refund can move affected earnings to a held status until the financial condition is resolved.",
    },
    {
      title: "Payout already processing",
      body: "If a payout is already in progress for your account, additional payouts wait until that payout completes.",
    },
    {
      title: "Stripe Connect setup",
      body: "Payouts require a verified Stripe Connect account. Complete or update payment setup in Artist Settings if Connect is not ready.",
    },
    {
      title: "Bank processing time",
      body: "After LiveCircuit initiates a payout through Stripe, your bank may need additional time to post the deposit.",
    },
  ];
}

export function calculateTicketEarningsExample(ticketPriceCents: number, platformFeePercent: number) {
  return calculateArtistTicketRevenueSplit({
    ticketSubtotalCents: ticketPriceCents,
    platformFeePercent,
  });
}
