import { describe, expect, it } from "vitest";
import {
  calculateDisputeTransferReversalAmount,
  sumPriorDisputeReversalCents,
} from "@/lib/monetization/dispute-reversal";

const BASE = {
  chargeAmountCents: 2000,
  transferAmountCents: 2000,
  grossCents: 2000,
  platformFeeCents: 200,
  artistEarningsCents: 1800,
  priorRefundCents: 0,
  priorDisputeReversalCents: 0,
};

describe("calculateDisputeTransferReversalAmount (D4)", () => {
  it("1. full $20 dispute caps reversal at 1800 artist cents", () => {
    expect(
      calculateDisputeTransferReversalAmount({
        ...BASE,
        disputeAmountCents: 2000,
      }),
    ).toBe(1800);
  });

  it("2. $10 dispute on $20 charge reverses proportional artist share (900)", () => {
    expect(
      calculateDisputeTransferReversalAmount({
        ...BASE,
        disputeAmountCents: 1000,
      }),
    ).toBe(900);
  });

  it("3. multiple disputes never exceed total artist earnings", () => {
    const first = calculateDisputeTransferReversalAmount({
      ...BASE,
      disputeAmountCents: 1000,
    });
    const second = calculateDisputeTransferReversalAmount({
      ...BASE,
      disputeAmountCents: 1000,
      priorDisputeReversalCents: first,
    });
    expect(first + second).toBeLessThanOrEqual(1800);
    expect(first).toBe(900);
    expect(second).toBe(900);
  });

  it("4. never returns negative amounts", () => {
    expect(
      calculateDisputeTransferReversalAmount({
        ...BASE,
        disputeAmountCents: 0,
      }),
    ).toBe(0);
    expect(
      calculateDisputeTransferReversalAmount({
        ...BASE,
        disputeAmountCents: 500,
        priorDisputeReversalCents: 1800,
      }),
    ).toBe(0);
  });

  it("5. prior refund reduces remaining artist exposure for disputes", () => {
    expect(
      calculateDisputeTransferReversalAmount({
        ...BASE,
        disputeAmountCents: 2000,
        priorRefundCents: 500,
      }),
    ).toBe(1350);
  });

  it("works for non-$20 ticket prices", () => {
    expect(
      calculateDisputeTransferReversalAmount({
        chargeAmountCents: 5000,
        transferAmountCents: 5000,
        disputeAmountCents: 2500,
        grossCents: 5000,
        platformFeeCents: 500,
        artistEarningsCents: 4500,
        priorRefundCents: 0,
        priorDisputeReversalCents: 0,
      }),
    ).toBe(2250);
  });
});

describe("sumPriorDisputeReversalCents", () => {
  it("sums metadata reversal_amount_cents for rows with reversals", () => {
    expect(
      sumPriorDisputeReversalCents([
        { stripe_transfer_reversal_id: "trr_1", metadata: { reversal_amount_cents: 900 } },
        { stripe_transfer_reversal_id: null, metadata: { reversal_amount_cents: 500 } },
        { stripe_transfer_reversal_id: "trr_2", metadata: { reversal_amount_cents: 450 } },
      ]),
    ).toBe(1350);
  });
});
