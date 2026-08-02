import { ARENA_TIER_META, ARTIST_BOOKING_PRICING, STADIUM_BOOKING } from "@/lib/pricing/livecircuit-pricing";
import type { MonetizationSnapshot, VenueTierId } from "@/lib/monetization/types";
import { effectiveVenueFeeCents, venueFeeDollars } from "@/lib/monetization/types";

export function ticketPricingFromSnapshot(snapshot: MonetizationSnapshot) {
  const t = snapshot.tickets;
  return {
    platformFeePercentage: t.platformFeePercent,
    platformFeeLabel: "Digital Ticketing Fee",
    paymentProcessingRatePercent: t.paymentProcessingRatePercent,
    paymentProcessingFixedCents: t.paymentProcessingFixedCents,
    paymentProcessingLabel: "Payment Processing",
    paymentProcessingDescription: "Standard card processing rates (typically 2.9% + $0.30 per transaction)",
    defaultTaxRatePercent: snapshot.taxes.salesTaxPercent,
    taxesLabel: "Taxes",
    taxesDescription: "Calculated where applicable based on event location and tax rules",
  };
}

export type TicketPricingRates = ReturnType<typeof ticketPricingFromSnapshot>;

export function bookingFeesRecordFromSnapshot(snapshot: MonetizationSnapshot): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const v of snapshot.venues) {
    const cents = effectiveVenueFeeCents(v);
    out[v.tierId] = cents != null ? cents / 100 : null;
  }
  return out;
}

export function buildVenueBookingFeesDisplay(snapshot: MonetizationSnapshot) {
  return snapshot.venues.map((v) => ({
    tier: v.name,
    fee: venueFeeDollars(v),
  }));
}

export function formatBookingFeeFromSnapshot(snapshot: MonetizationSnapshot, tierId: VenueTierId): string {
  if (tierId === "stadium") return STADIUM_BOOKING.headline;
  const tier = snapshot.venues.find((v) => v.tierId === tierId);
  return tier ? venueFeeDollars(tier) : STADIUM_BOOKING.headline;
}

export function buildBookingFeeByVenue(snapshot: MonetizationSnapshot) {
  return ARENA_TIER_META.map((v) => ({
    venueId: v.id,
    label: v.name,
    fee: formatBookingFeeFromSnapshot(snapshot, v.id),
  }));
}

export function buildFeeGuideItems(snapshot: MonetizationSnapshot) {
  const ticket = ticketPricingFromSnapshot(snapshot);
  return [
    { item: "Creating an account", cost: "FREE", note: "No credit card required" },
    { item: "Building your profile", cost: "FREE", note: "Full artist presence" },
    { item: "Browsing digital venues", cost: "FREE", note: "Explore all tiers" },
    { item: "Searching events", cost: "FREE", note: "Discover and research" },
    { item: "Following artists", cost: "FREE", note: "Build your network" },
    { item: "Merchandise sales", cost: "100% to artist", note: "LiveCircuit does not take merch revenue" },
    { item: "Tips & donations", cost: "100% to artist", note: "Direct fan support stays with you" },
    { item: "Booking a digital show", cost: "Per-event booking fee", note: "Only charged when you book — see tier rates below" },
    {
      item: ticket.platformFeeLabel,
      cost: `${ticket.platformFeePercentage}% on ticket sales`,
      note: "Transparent digital ticketing only — disclosed before you publish. Does not apply to merch, tips, or donations.",
    },
    {
      item: ticket.paymentProcessingLabel,
      cost: ticket.paymentProcessingDescription,
      note: "Actual payment processor rates",
    },
  ];
}

export function buildArtistBookingPricingDisplay(snapshot: MonetizationSnapshot) {
  const ticket = ticketPricingFromSnapshot(snapshot);
  return {
    ...ticket,
    bookingFees: bookingFeesRecordFromSnapshot(snapshot),
    bookingFeeExplainer: ARTIST_BOOKING_PRICING.bookingFeeExplainer,
    noSubscriptionMessage: ARTIST_BOOKING_PRICING.noSubscriptionMessage,
    transparencyMessage: ARTIST_BOOKING_PRICING.transparencyMessage,
  };
}

export type ArtistBookingPricingDisplay = ReturnType<typeof buildArtistBookingPricingDisplay>;

export function buildCreatorPromiseFaq(snapshot: MonetizationSnapshot) {
  const fees = snapshot.venues.filter((v) => v.tierId !== "stadium");
  const feeLine = fees.map((v) => `${v.name} ${venueFeeDollars(v)}`).join(", ");
  const ticketPct = snapshot.tickets.platformFeePercent;

  return [
    {
      q: "Why don't artists pay monthly?",
      a: "LiveCircuit is Artist First. There are no monthly artist fees, Pro plans, or Premium subscriptions. Join free and only pay when you host a digital event.",
    },
    {
      q: "Why is there a venue booking fee?",
      a: "The booking fee reserves digital venue inventory and reduces abandoned bookings. It is intentionally affordable—not a major revenue source.",
    },
    {
      q: "How much does it cost to host an event?",
      a: `Venue booking: ${feeLine}. Stadium requires approval and custom pricing. Plus transparent ticketing fees on ticket sales only.`,
    },
    {
      q: "What do I keep?",
      a: "100% of tips, donations, and merchandise revenue. Full ownership of your content, publishing rights, and master recordings. No exclusivity—you can leave anytime.",
    },
    {
      q: "How do ticket fees work?",
      a: `A ${ticketPct}% digital ticketing fee applies to ticket sales only, plus standard payment processing. Fees are disclosed before you publish. Merch, tips, and donations are never taxed by LiveCircuit.`,
    },
    {
      q: "Why are booking fees so affordable?",
      a: "We believe the barrier to performing digitally should be almost zero. Booking fees cover venue reservation and hosting—they are not designed to be a profit center.",
    },
    {
      q: "How does LiveCircuit make money?",
      a: "Digital ticketing, talent agency subscriptions, sponsorships, advertising, and fan purchases—not by charging artists a monthly fee or taxing merch, tips, and donations.",
    },
    {
      q: "Can I leave whenever I want?",
      a: "Yes. There are no exclusivity contracts and no monthly artist fees. Leave at any time without losing ownership of your work.",
    },
  ] as const;
}
