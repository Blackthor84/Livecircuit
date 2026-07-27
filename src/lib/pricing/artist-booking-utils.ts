import {
  ARTIST_BOOKING_PRICING,
  BOOKING_FEES,
  type ArenaTierId,
  getArenaTierMeta,
} from "@/lib/pricing/livecircuit-pricing";

export type ArtistEarningsBreakdown = {
  venueId: ArenaTierId;
  venueName: string;
  ticketPrice: number;
  expectedAttendance: number;
  grossRevenue: number;
  bookingFee: number;
  platformFee: number;
  paymentProcessing: number;
  taxes: number;
  estimatedNetEarnings: number;
  breakEvenTicketCount: number;
  venueFillPercent: number;
};

export function calculateArtistEarnings({
  venueId,
  ticketPrice,
  expectedAttendance,
}: {
  venueId: ArenaTierId;
  ticketPrice: number;
  expectedAttendance: number;
}): ArtistEarningsBreakdown {
  const venue = getArenaTierMeta(venueId);
  const grossRevenue = ticketPrice * expectedAttendance;
  const bookingFee = BOOKING_FEES[venueId];
  const platformFee = grossRevenue * (ARTIST_BOOKING_PRICING.platformFeePercentage / 100);
  const paymentProcessing =
    grossRevenue * (ARTIST_BOOKING_PRICING.paymentProcessingRatePercent / 100) +
    expectedAttendance * (ARTIST_BOOKING_PRICING.paymentProcessingFixedCents / 100);
  const taxes = grossRevenue * (ARTIST_BOOKING_PRICING.defaultTaxRatePercent / 100);
  const estimatedNetEarnings = grossRevenue - bookingFee - platformFee - paymentProcessing - taxes;
  const venueFillPercent = Math.round((expectedAttendance / venue.maxCapacity) * 100);

  const netPerTicket =
    ticketPrice * (1 - ARTIST_BOOKING_PRICING.platformFeePercentage / 100) -
    ARTIST_BOOKING_PRICING.paymentProcessingFixedCents / 100 -
    ticketPrice * (ARTIST_BOOKING_PRICING.paymentProcessingRatePercent / 100);
  const breakEvenTicketCount =
    netPerTicket > 0 ? Math.ceil((bookingFee + taxes) / netPerTicket) : 999;

  return {
    venueId,
    venueName: venue.name,
    ticketPrice,
    expectedAttendance,
    grossRevenue,
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
