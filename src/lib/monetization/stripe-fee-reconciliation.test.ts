import { describe, expect, it, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

const retrievePaymentIntent = vi.fn();

vi.mock("@/lib/stripe/server", () => ({
  getStripe: () => ({
    paymentIntents: {
      retrieve: retrievePaymentIntent,
    },
    balanceTransactions: {
      retrieve: vi.fn(),
    },
  }),
}));

import {
  reconcileOrderStripeFees,
  reconcileOrderStripeFeesFromCharge,
  resolveOrderIdForStripeCharge,
} from "@/lib/monetization/stripe-fee-reconciliation.service";

describe("resolveOrderIdForStripeCharge", () => {
  it("prefers explicit order id hint", async () => {
    const supabase = { from: vi.fn() };
    const stripe = { paymentIntents: { retrieve: vi.fn() } };

    const orderId = await resolveOrderIdForStripeCharge(
      supabase as never,
      stripe as never,
      { metadata: {} } as Stripe.Charge,
      "order-123",
    );

    expect(orderId).toBe("order-123");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("reads order id from charge metadata", async () => {
    const supabase = { from: vi.fn() };
    const stripe = { paymentIntents: { retrieve: vi.fn() } };

    const orderId = await resolveOrderIdForStripeCharge(
      supabase as never,
      stripe as never,
      { metadata: { order_id: "order-meta" } } as Stripe.Charge,
    );

    expect(orderId).toBe("order-meta");
  });

  it("falls back to payment intent metadata when order row is not linked yet", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null })),
          })),
        })),
      })),
    };
    const stripe = {
      paymentIntents: {
        retrieve: vi.fn(() =>
          Promise.resolve({ metadata: { order_id: "order-from-pi" } }),
        ),
      },
    };

    const orderId = await resolveOrderIdForStripeCharge(
      supabase as never,
      stripe as never,
      { payment_intent: "pi_123", metadata: {} } as Stripe.Charge,
    );

    expect(orderId).toBe("order-from-pi");
    expect(stripe.paymentIntents.retrieve).toHaveBeenCalledWith("pi_123");
  });
});

describe("reconcileOrderStripeFeesFromCharge", () => {
  it("no-ops when no payment intent is present", async () => {
    const supabase = { from: vi.fn() };
    await reconcileOrderStripeFeesFromCharge(
      supabase as never,
      { metadata: {} } as Stripe.Charge,
    );
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe("reconcileOrderStripeFees (D2/D3)", () => {
  beforeEach(() => {
    retrievePaymentIntent.mockReset();
  });

  it("12. persists stripe_transfer_id when fee already reconciled", async () => {
    retrievePaymentIntent.mockResolvedValue({
      latest_charge: {
        balance_transaction: { id: "txn_1", fee: 88 },
        transfer: { id: "tr_1" },
        application_fee: { id: "fee_1" },
      },
    });

    const update = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }));
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: {
                stripe_fee_cents: 88,
                stripe_balance_transaction_id: "txn_1",
                stripe_transfer_id: null,
                stripe_application_fee_id: null,
              },
            })),
          })),
        })),
        update,
      })),
    };

    const result = await reconcileOrderStripeFees(supabase as never, {
      orderId: "order-1",
      paymentIntentId: "pi_1",
    });

    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_transfer_id: "tr_1",
        stripe_application_fee_id: "fee_1",
      }),
    );
  });

  it("13. missing balance transaction does not throw and still persists transfer id", async () => {
    retrievePaymentIntent.mockResolvedValue({
      latest_charge: {
        balance_transaction: null,
        transfer: { id: "tr_2" },
        application_fee: null,
      },
    });

    const update = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }));
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: {
                stripe_fee_cents: null,
                stripe_balance_transaction_id: null,
                stripe_transfer_id: null,
                stripe_application_fee_id: null,
              },
            })),
          })),
        })),
        update,
      })),
    };

    const result = await reconcileOrderStripeFees(supabase as never, {
      orderId: "order-2",
      paymentIntentId: "pi_2",
    });

    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith({ stripe_transfer_id: "tr_2" });
  });
});
