import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import {
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
