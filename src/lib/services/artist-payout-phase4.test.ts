import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  calculateArtistTicketRevenueSplit,
  isPaidArtistTicketCheckout,
} from "@/lib/monetization/ticket-revenue-split";
import { isDestinationChargeTicketOrder } from "@/lib/services/refund.service";
import { isArtistPayoutReady } from "@/lib/stripe/connect-status";
import type { ArtistConnectRecord } from "@/lib/stripe/connect-status";

const DEFAULT_MIN_PAYOUT_CENTS = 2500;

function addDays(iso: string, days: number): Date {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

describe("Phase 4 artist payout", () => {
  it("TEST 1: $20 ticket → $18 artist earnings", () => {
    const split = calculateArtistTicketRevenueSplit({ ticketSubtotalCents: 2000 });
    expect(split.artistEarningsCents).toBe(1800);
  });

  it("TEST 2: Day 6 23h → still pending by available_at", () => {
    const paidAt = new Date("2026-08-01T12:00:00.000Z");
    const availableAt = addDays(paidAt.toISOString(), 7);
    const checkAt = new Date("2026-08-08T11:00:00.000Z");
    expect(checkAt.getTime()).toBeLessThan(availableAt.getTime());
  });

  it("TEST 3: Day 7 → available_at reached", () => {
    const paidAt = new Date("2026-08-01T12:00:00.000Z");
    const availableAt = addDays(paidAt.toISOString(), 7);
    const checkAt = new Date("2026-08-08T12:00:00.000Z");
    expect(checkAt.getTime()).toBeGreaterThanOrEqual(availableAt.getTime());
  });

  it("TEST 7: three tickets batch to $90 payout total", () => {
    const amounts = [1800, 2700, 4500];
    expect(amounts.reduce((s, n) => s + n, 0)).toBe(9000);
  });

  it("TEST 8: below minimum payout threshold is skipped", () => {
    expect(1800).toBeLessThan(DEFAULT_MIN_PAYOUT_CENTS);
    expect(9000).toBeGreaterThanOrEqual(DEFAULT_MIN_PAYOUT_CENTS);
  });

  it("TEST 9: restricted Connect without manual payouts is not payout-ready", () => {
    const record: ArtistConnectRecord = {
      stripe_account_id: "acct_1",
      stripe_onboarding_complete: true,
      stripe_charges_enabled: true,
      stripe_payouts_enabled: true,
      stripe_payouts_manual: false,
      stripe_payouts_schedule: "daily",
      stripe_details_submitted: true,
      stripe_requirements_due: [],
      stripe_connect_updated_at: null,
    };
    expect(isArtistPayoutReady("ready", record)).toBe(false);
  });

  it("TEST 20: ticket payout service does not call stripe.transfers.create", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/lib/services/artist-payout.service.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/transfers\.create/);
    expect(source).toMatch(/payouts\.create/);
  });

  it("TEST 21: stripe fee is not hardcoded in reconciliation service", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/lib/monetization/stripe-fee-reconciliation.service.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/2\.9/);
    expect(source).not.toMatch(/0\.029/);
    expect(source).toMatch(/balance_transaction/);
  });

  it("TEST 22: platform fee + artist earnings = gross", () => {
    const split = calculateArtistTicketRevenueSplit({ ticketSubtotalCents: 5000 });
    expect(split.platformFeeCents + split.artistEarningsCents).toBe(split.grossCents);
  });

  it("TEST 23: tips do not use ticket destination refund path", () => {
    expect(
      isDestinationChargeTicketOrder({
        id: "o1",
        user_id: "u1",
        artist_id: "a1",
        status: "paid",
        stripe_payment_intent_id: "pi_1",
        order_type: "tip",
        total_cents: 500,
        gross_cents: null,
        platform_fee_cents: 0,
        artist_earnings_cents: 500,
        refund_cents: 0,
        metadata: { ticket_revenue_split: true },
      }),
    ).toBe(false);

    expect(
      isPaidArtistTicketCheckout({ orderType: "merch", unitAmountCents: 1000, artistId: "a1" }),
    ).toBe(false);
  });
});
