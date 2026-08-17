import { describe, expect, it } from "vitest";
import {
  buildArtistEarningsDisplayConfig,
  calculateTicketEarningsExample,
  formatUsdFromCents,
} from "@/lib/monetization/artist-earnings-display";
import type { MonetizationSnapshot } from "@/lib/monetization/types";

const snapshot = {
  tickets: {
    platformFeePercent: 10,
    paymentProcessingRatePercent: 2.9,
    paymentProcessingFixedCents: 30,
  },
  taxes: { salesTaxPercent: 0 },
  payouts: {
    payoutDelayDays: 7,
    minPayoutCents: 2500,
    maxPayoutCents: null,
    reservePercent: 0,
    manualReviewThresholdCents: 100000,
    stripeConnectReady: false,
  },
} as MonetizationSnapshot;

describe("artist-earnings-display", () => {
  it("builds display config from snapshot", () => {
    const config = buildArtistEarningsDisplayConfig(snapshot);
    expect(config.platformFeePercent).toBe(10);
    expect(config.payoutDelayDays).toBe(7);
    expect(config.minPayoutCents).toBe(2500);
  });

  it("calculates $20 example using ticket revenue split helper", () => {
    const split = calculateTicketEarningsExample(2000, 10);
    expect(split.grossCents).toBe(2000);
    expect(split.platformFeeCents).toBe(200);
    expect(split.artistEarningsCents).toBe(1800);
  });

  it("formats currency from cents", () => {
    expect(formatUsdFromCents(2500)).toBe("$25.00");
  });
});
