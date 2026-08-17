import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { resolveOrderForDispute } from "@/lib/services/dispute-order-resolution";

describe("resolveOrderForDispute (D5)", () => {
  it("resolves order from payment intent metadata before local PI linkage", async () => {
    const orderRow = {
      id: "order-from-pi",
      artist_id: "artist-1",
      stripe_transfer_id: null,
      gross_cents: 2000,
      platform_fee_cents: 200,
      artist_earnings_cents: 1800,
      order_type: "ticket",
      metadata: {},
      refund_cents: 0,
      total_cents: 2000,
      status: "paid",
      stripe_payment_intent_id: null,
      stripe_checkout_session_id: "cs_test_123",
    };

    const supabase = {
      from: vi.fn((table: string) => {
        if (table !== "orders") throw new Error(`unexpected table ${table}`);
        return {
          select: vi.fn(() => ({
            eq: vi.fn((_col: string, val: string) => ({
              maybeSingle: vi.fn(async () => {
                if (val === "order-from-pi") return { data: orderRow };
                return { data: null };
              }),
            })),
          })),
        };
      }),
    };

    const stripe = {
      charges: { retrieve: vi.fn() },
      paymentIntents: {
        retrieve: vi.fn(async () => ({ metadata: { order_id: "order-from-pi" } })),
      },
      checkout: { sessions: { list: vi.fn() } },
    };

    const dispute = {
      id: "du_test",
      payment_intent: "pi_early",
      charge: "ch_test",
    } as Stripe.Dispute;

    const order = await resolveOrderForDispute(supabase as never, stripe as never, dispute);
    expect(order?.id).toBe("order-from-pi");
  });

  it("returns null when no order can be resolved yet", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: null })),
          })),
        })),
      })),
    };

    const stripe = {
      charges: { retrieve: vi.fn(async () => ({ metadata: {} })) },
      paymentIntents: { retrieve: vi.fn(async () => ({ metadata: {} })) },
      checkout: { sessions: { list: vi.fn(async () => ({ data: [] })) } },
    };

    const order = await resolveOrderForDispute(
      supabase as never,
      stripe as never,
      {
        id: "du_orphan",
        payment_intent: "pi_unknown",
        charge: "ch_unknown",
      } as Stripe.Dispute,
    );

    expect(order).toBeNull();
  });
});
