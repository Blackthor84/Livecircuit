import { describe, expect, it } from "vitest";
import { computeArtistPayoutSpendableCents } from "@/lib/monetization/payout-limits";

describe("computeArtistPayoutSpendableCents", () => {
  it("returns full available when no caps", () => {
    expect(computeArtistPayoutSpendableCents(9000, { reservePercent: 0, maxPayoutCents: null })).toBe(9000);
  });

  it("keeps minimum gate behavior inputs for LIFE-style 1800 available", () => {
    const spendable = computeArtistPayoutSpendableCents(1800, { reservePercent: 0, maxPayoutCents: null });
    expect(spendable).toBe(1800);
    expect(spendable).toBeLessThan(2500);
  });

  it("never returns negative spendable after full reserve", () => {
    expect(computeArtistPayoutSpendableCents(5000, { reservePercent: 100, maxPayoutCents: null })).toBe(0);
  });

  it("applies max after reserve without exceeding available", () => {
    expect(
      computeArtistPayoutSpendableCents(10_000, { reservePercent: 20, maxPayoutCents: 3000 }),
    ).toBe(3000);
  });
});
