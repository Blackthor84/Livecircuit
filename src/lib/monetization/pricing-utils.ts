import { ARENA_TIER_META, ARTIST_BOOKING_PRICING, STADIUM_BOOKING } from "@/lib/pricing/livecircuit-pricing";
import type { MonetizationSnapshot, VenueTierId } from "@/lib/monetization/types";
import { effectiveVenueFeeCents, venueFeeDollars } from "@/lib/monetization/types";

export function ticketPricingFromSnapshot(snapshot: MonetizationSnapshot) {
  const t = snapshot.tickets;
  return {
    platformFeePercentage: t.platformFeePercent,
    platformFeeLabel: "LiveCircuit commission",
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
    { item: "Applying for performance opportunities", cost: "FREE", note: "Browse and apply at no cost" },
    { item: "Hosting a digital show", cost: "FREE to publish", note: "No mandatory booking fee to create events on LiveCircuit" },
    {
      item: ticket.platformFeeLabel,
      cost: `${ticket.platformFeePercentage}% on ticket sales`,
      note: "Commission on successful ticket sales only — disclosed before you publish. Does not apply to merch, tips, or donations.",
    },
    {
      item: "Private bookings",
      cost: `${snapshot.commissions.privateBookingCommissionPercent}% when enabled`,
      note: "Proposed commission on paid private bookings when that checkout is available. Not charged today.",
    },
    {
      item: ticket.paymentProcessingLabel,
      cost: "Paid by LiveCircuit on ticket sales",
      note: ticket.paymentProcessingDescription,
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
      a: "LiveCircuit is Artist First. Artist accounts, profiles, and booking applications are free. There are no monthly artist fees or Premium subscriptions.",
    },
    {
      q: "Do artists pay a booking fee to join or publish?",
      a: "No. LiveCircuit does not require artists to pay a booking fee to create an account, build a profile, apply for opportunities, or publish a digital event.",
    },
    {
      q: "How much does it cost to host an event?",
      a: `Creating and publishing events is free. LiveCircuit earns a ${ticketPct}% commission on ticket sales (and a proposed ${snapshot.commissions.privateBookingCommissionPercent}% on private bookings when that payment option is enabled). Partner venue tier reference pricing (${feeLine}) is not a mandatory artist charge on LiveCircuit today.`,
    },
    {
      q: "What do I keep?",
      a: "100% of tips, donations, and merchandise revenue. Full ownership of your content, publishing rights, and master recordings. No exclusivity—you can leave anytime.",
    },
    {
      q: "How do ticket fees work?",
      a: `A ${ticketPct}% LiveCircuit commission applies to ticket sales only. Payment processing on those sales is handled by LiveCircuit. Fees are disclosed before you publish. Merch, tips, and donations are never taxed by LiveCircuit.`,
    },
    {
      q: "How does LiveCircuit make money?",
      a: "Ticket commissions, talent agency subscriptions, sponsorships, advertising, and fan purchases—not by charging artists monthly fees, mandatory booking fees, or taxing merch, tips, and donations.",
    },
    {
      q: "Can I leave whenever I want?",
      a: "Yes. There are no exclusivity contracts and no monthly artist fees. Leave at any time without losing ownership of your work.",
    },
  ] as const;
}
