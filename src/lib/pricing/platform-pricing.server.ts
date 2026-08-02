import "server-only";

import type { BookableArenaTierId } from "@/lib/pricing/livecircuit-pricing";
import { getMonetizationSnapshot } from "@/lib/monetization/pricing-resolver.server";
import type { MonetizationSnapshot } from "@/lib/monetization/types";
import { effectiveVenueFeeCents } from "@/lib/monetization/types";

export type PlatformPricingConfig = {
  bookingFees: Record<BookableArenaTierId, number>;
  platformFeePercent: number;
  paymentProcessingRatePercent: number;
  paymentProcessingFixedCents: number;
  stadiumRequiresApproval: boolean;
  updatedAt: string | null;
};

function snapshotToPlatformConfig(snapshot: MonetizationSnapshot): PlatformPricingConfig {
  const bookingFees = {} as Record<BookableArenaTierId, number>;
  for (const tier of snapshot.venues) {
    if (tier.tierId === "stadium") continue;
    const cents = effectiveVenueFeeCents(tier);
    bookingFees[tier.tierId as BookableArenaTierId] = cents != null ? cents / 100 : 0;
  }
  const stadium = snapshot.venues.find((v) => v.tierId === "stadium");
  return {
    bookingFees,
    platformFeePercent: snapshot.tickets.platformFeePercent,
    paymentProcessingRatePercent: snapshot.tickets.paymentProcessingRatePercent,
    paymentProcessingFixedCents: snapshot.tickets.paymentProcessingFixedCents,
    stadiumRequiresApproval: stadium?.requiresApproval ?? true,
    updatedAt: snapshot.loadedAt,
  };
}

/** @deprecated Use getMonetizationSnapshot directly — kept for existing imports. */
export async function getPlatformPricingConfig(): Promise<PlatformPricingConfig> {
  const snapshot = await getMonetizationSnapshot();
  return snapshotToPlatformConfig(snapshot);
}

export function getDefaultPlatformPricingConfig(): PlatformPricingConfig {
  return {
    bookingFees: { community: 25, club: 75, theater: 200, arena: 500 },
    platformFeePercent: 10,
    paymentProcessingRatePercent: 2.9,
    paymentProcessingFixedCents: 30,
    stadiumRequiresApproval: true,
    updatedAt: null,
  };
}

export { getMonetizationSnapshot };
