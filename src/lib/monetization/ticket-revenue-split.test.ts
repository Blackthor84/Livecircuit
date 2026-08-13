import { describe, expect, it } from "vitest";
import {
  calculateArtistTicketRevenueSplit,
  DEFAULT_PLATFORM_TICKET_FEE_PERCENT,
  isPaidArtistTicketCheckout,
  proportionalTicketRefundSplit,
} from "@/lib/monetization/ticket-revenue-split";

describe("ticket revenue split", () => {
  it("TEST 1: $20 ticket splits to 2000 / 200 / 1800", () => {
    const split = calculateArtistTicketRevenueSplit({ ticketSubtotalCents: 2000 });
    expect(split.grossCents).toBe(2000);
    expect(split.platformFeeCents).toBe(200);
    expect(split.artistEarningsCents).toBe(1800);
    expect(split.grossCents).toBe(split.platformFeeCents + split.artistEarningsCents);
  });

  it("TEST 2: $100 ticket splits to 10000 / 1000 / 9000", () => {
    const split = calculateArtistTicketRevenueSplit({ ticketSubtotalCents: 10000 });
    expect(split.grossCents).toBe(10000);
    expect(split.platformFeeCents).toBe(1000);
    expect(split.artistEarningsCents).toBe(9000);
  });

  it("TEST 3: free ticket is not a paid artist ticket checkout", () => {
    expect(
      isPaidArtistTicketCheckout({ orderType: "ticket", unitAmountCents: 0, artistId: "artist-1" }),
    ).toBe(false);
  });

  it("TEST 11: locked platform fee percent preserves historical order economics", () => {
    const locked = calculateArtistTicketRevenueSplit({
      ticketSubtotalCents: 2000,
      platformFeePercent: 10,
    });
    const futureConfig = calculateArtistTicketRevenueSplit({
      ticketSubtotalCents: 2000,
      platformFeePercent: 15,
    });
    expect(locked.platformFeeCents).toBe(200);
    expect(futureConfig.platformFeeCents).toBe(300);
    expect(locked.platformFeePercent).toBe(10);
  });

  it("TEST 10 / partial refund: proportional reversal on $10 of $20 ticket", () => {
    const reversal = proportionalTicketRefundSplit({
      grossCents: 2000,
      platformFeeCents: 200,
      artistEarningsCents: 1800,
      refundCents: 1000,
    });
    expect(reversal.fullRefund).toBe(false);
    expect(reversal.artistReversalCents).toBe(900);
    expect(reversal.platformReversalCents).toBe(100);
  });

  it("uses default 10% platform fee constant", () => {
    const split = calculateArtistTicketRevenueSplit({ ticketSubtotalCents: 1000 });
    expect(split.platformFeePercent).toBe(DEFAULT_PLATFORM_TICKET_FEE_PERCENT);
    expect(split.artistSharePercent).toBe(90);
  });

  it("TEST 14: tips are not paid artist ticket checkout", () => {
    expect(
      isPaidArtistTicketCheckout({ orderType: "tip", unitAmountCents: 500, artistId: "artist-1" }),
    ).toBe(false);
  });

  it("TEST 14: merch is not paid artist ticket checkout", () => {
    expect(
      isPaidArtistTicketCheckout({ orderType: "merch", unitAmountCents: 2500, artistId: "artist-1" }),
    ).toBe(false);
  });
});
