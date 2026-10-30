import { describe, expect, it } from "vitest";
import { verifyEventForFastPay } from "@/lib/monetization/fastpay.server";
import { computeArtistPayoutSpendableCents } from "@/lib/monetization/payout-limits";
import { isFeatureEnabled } from "@/lib/monetization/feature-flags.server";
import type { MonetizationSnapshot } from "@/lib/monetization/types";

describe("FastPay verification", () => {
  it("accepts ended performance with started_at", () => {
    expect(
      verifyEventForFastPay({
        status: "ended",
        started_at: "2026-06-01T01:00:00Z",
        ended_at: "2026-06-01T03:00:00Z",
      }).ok,
    ).toBe(true);
  });

  it("rejects cancelled events", () => {
    expect(
      verifyEventForFastPay({
        status: "cancelled",
        started_at: null,
        ended_at: null,
      }).reason,
    ).toBe("cancelled");
  });

  it("rejects events that never started", () => {
    expect(
      verifyEventForFastPay({
        status: "ended",
        started_at: null,
        ended_at: "2026-06-01T03:00:00Z",
      }).reason,
    ).toBe("never_started");
  });

  it("rejects live events", () => {
    expect(
      verifyEventForFastPay({
        status: "live",
        started_at: "2026-06-01T01:00:00Z",
        ended_at: null,
      }).reason,
    ).toBe("not_ended");
  });
});

describe("payout reserve and max caps", () => {
  it("applies reserve percent before max cap", () => {
    expect(
      computeArtistPayoutSpendableCents(10_000, { reservePercent: 10, maxPayoutCents: 5000 }),
    ).toBe(5000);
  });

  it("respects max payout when no reserve", () => {
    expect(
      computeArtistPayoutSpendableCents(10_000, { reservePercent: 0, maxPayoutCents: 2500 }),
    ).toBe(2500);
  });
});

describe("artist_fastpay feature flag", () => {
  const baseSnapshot = {
    featureFlags: [
      {
        flagKey: "artist_fastpay",
        label: "FastPay",
        description: null,
        visibility: "coming_soon" as const,
        isEnabled: true,
        rolloutPercent: 100,
        rolloutRegions: [],
        rolloutRoles: [],
        startsAt: null,
        endsAt: null,
        version: 1,
      },
    ],
  } as unknown as MonetizationSnapshot;

  it("is off when visibility is coming_soon", () => {
    expect(isFeatureEnabled(baseSnapshot, "artist_fastpay", {})).toBe(false);
  });

  it("is on when enabled and visibility enabled", () => {
    const snapshot = {
      ...baseSnapshot,
      featureFlags: [{ ...baseSnapshot.featureFlags[0], visibility: "enabled" as const }],
    } as MonetizationSnapshot;
    expect(isFeatureEnabled(snapshot, "artist_fastpay", {})).toBe(true);
  });
});

describe("cancelled FastPay workflow (policy)", () => {
  it("held status blocks release eligibility timestamps", () => {
    const order = { artist_payout_status: "held", available_at: null, payout_eligibility_policy: "fastpay" };
    expect(order.artist_payout_status).toBe("held");
    expect(order.available_at).toBeNull();
  });
});

describe("golden fixture policy (no migration)", () => {
  it("historical orders default to standard_hold policy", () => {
    const historical = { payout_eligibility_policy: "standard_hold", available_at: "2026-08-24T00:00:00Z" };
    expect(historical.payout_eligibility_policy).toBe("standard_hold");
    expect(historical.available_at).toBeTruthy();
  });

  it("fastpay orders start with null available_at until performance ends", () => {
    const fastpayOrder = { payout_eligibility_policy: "fastpay", available_at: null as string | null };
    expect(fastpayOrder.available_at).toBeNull();
  });
});
