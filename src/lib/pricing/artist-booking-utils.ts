import {
  getBookingFee,
  type ArenaTierId,
  getArenaTierMeta,
} from "@/lib/pricing/livecircuit-pricing";
import type { MonetizationSnapshot } from "@/lib/monetization/types";
import { effectiveVenueFeeCents } from "@/lib/monetization/types";
import {
  ticketPricingFromSnapshot,
  type TicketPricingRates,
} from "@/lib/monetization/pricing-utils";
import { resolveVenuePriceSync } from "@/lib/business-rules/pricing-client";
import type { BusinessRulesSnapshot, RuleEvaluationContext } from "@/lib/business-rules/types";

export type { TicketPricingRates };

export type ArtistEarningsBreakdown = {
  venueId: ArenaTierId;
  venueName: string;
  ticketPrice: number;
  expectedAttendance: number;
  grossRevenue: number;
  /** Informational partner-tier reference — not subtracted from artist net (not charged on LiveCircuit today). */
  referenceVenueFee: number;
  platformFee: number;
  paymentProcessing: number;
  taxes: number;
  estimatedNetEarnings: number;
  breakEvenTicketCount: number;
  venueFillPercent: number;
  /** @deprecated Use referenceVenueFee — kept for legacy UI keys */
  bookingFee: number;
};

export function calculateArtistEarnings({
  venueId,
  ticketPrice,
  expectedAttendance,
  pricing,
  snapshot,
  rulesSnapshot,
  ruleContext,
}: {
  venueId: ArenaTierId;
  ticketPrice: number;
  expectedAttendance: number;
  pricing?: TicketPricingRates;
  snapshot?: MonetizationSnapshot;
  rulesSnapshot?: BusinessRulesSnapshot;
  ruleContext?: RuleEvaluationContext;
}) {
  const rates = pricing ?? (snapshot ? ticketPricingFromSnapshot(snapshot) : null);
  const platformFeePct = rates?.platformFeePercentage ?? 10;
  const processingRate = rates?.paymentProcessingRatePercent ?? 2.9;
  const processingFixed = rates?.paymentProcessingFixedCents ?? 30;
  const taxRate = rates?.defaultTaxRatePercent ?? 0;

  const venue = getArenaTierMeta(venueId);
  const grossRevenue = ticketPrice * expectedAttendance;

  let bookingFee = 0;
  if (snapshot && rulesSnapshot) {
    const ctx: RuleEvaluationContext & { venueType: ArenaTierId } = {
      userType: "artist",
      venueType: venueId,
      eventCount: 0,
      ...ruleContext,
    };
    const resolved = resolveVenuePriceSync(snapshot, rulesSnapshot, ctx);
    bookingFee = resolved.feeCents / 100;
  } else if (snapshot) {
    const tier = snapshot.venues.find((v) => v.tierId === venueId);
    bookingFee = tier ? (effectiveVenueFeeCents(tier) ?? 0) / 100 : 0;
  } else {
    bookingFee = getBookingFee(venueId) ?? 0;
  }

  const platformFee = grossRevenue * (platformFeePct / 100);
  const paymentProcessing =
    grossRevenue * (processingRate / 100) +
    expectedAttendance * (processingFixed / 100);
  const taxes = grossRevenue * (taxRate / 100);
  const estimatedNetEarnings = grossRevenue - platformFee - taxes;
  const venueFillPercent = Math.round((expectedAttendance / venue.maxCapacity) * 100);

  const netPerTicket = ticketPrice * (1 - platformFeePct / 100);
  const breakEvenTicketCount = netPerTicket > 0 ? Math.ceil(taxes / netPerTicket) : 999;

  return {
    venueId,
    venueName: venue.name,
    ticketPrice,
    expectedAttendance,
    grossRevenue,
    referenceVenueFee: bookingFee,
    bookingFee,
    platformFee,
    paymentProcessing,
    taxes,
    estimatedNetEarnings,
    breakEvenTicketCount,
    venueFillPercent,
  };
}

export function formatPricingCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount >= 1000 ? 0 : 2,
  }).format(amount);
}

export function formatPricingPercent(value: number): string {
  return `${value}%`;
}
