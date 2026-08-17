import { describe, expect, it, vi, beforeEach } from "vitest";
import type Stripe from "stripe";
import {
  DisputeDeferredError,
  handleDestinationChargeDisputeCreated,
} from "@/lib/services/dispute.service";

vi.mock("@/lib/services/dispute-order-resolution", () => ({
  resolveOrderForDispute: vi.fn(),
  fetchOrderById: vi.fn(),
  DISPUTE_ORDER_SELECT: "*",
}));

vi.mock("@/lib/monetization/financial-ledger.service", () => ({
  recordDispute: vi.fn(async () => undefined),
}));

import { resolveOrderForDispute } from "@/lib/services/dispute-order-resolution";

const ORDER = {
  id: "order-1",
  artist_id: "artist-1",
  stripe_transfer_id: "tr_1",
  gross_cents: 2000,
  platform_fee_cents: 200,
  artist_earnings_cents: 1800,
  order_type: "ticket",
  metadata: {},
  refund_cents: 0,
  total_cents: 2000,
  status: "paid",
  stripe_payment_intent_id: "pi_1",
  stripe_checkout_session_id: "cs_1",
};

function buildSupabase(existingDispute: Record<string, unknown> | null) {
  const rpc = vi.fn(async () => null);
  const insert = vi.fn(async () => ({ data: null, error: null }));
  const updateEq = vi.fn(async () => ({ data: null, error: null }));

  const from = vi.fn((table: string) => {
    if (table === "artist_disputes") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn((_col: string) => ({
            maybeSingle: vi.fn(async () =>
              _col === "stripe_dispute_id" ? { data: existingDispute } : { data: null },
            ),
            neq: vi.fn(async () => ({ data: [] })),
            or: vi.fn(async () => ({ data: [] })),
          })),
        })),
        insert,
        update: vi.fn(() => ({ eq: updateEq })),
      };
    }
    if (table === "orders") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: ORDER })),
          })),
        })),
      };
    }
    throw new Error(`unexpected table ${table}`);
  });

  return { from, rpc, insert, updateEq };
}

describe("handleDestinationChargeDisputeCreated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defers when order cannot be resolved", async () => {
    vi.mocked(resolveOrderForDispute).mockResolvedValueOnce(null);
    const supabase = buildSupabase(null);
    const stripe = { transfers: { createReversal: vi.fn() }, charges: { retrieve: vi.fn() } };

    const result = await handleDestinationChargeDisputeCreated(
      supabase as never,
      stripe as never,
      {
        id: "du_defer",
        amount: 2000,
        status: "needs_response",
        payment_intent: "pi_missing",
        charge: "ch_missing",
      } as Stripe.Dispute,
      "evt_1",
    );

    expect(result.deferred).toBe(true);
    expect(result.orderId).toBeNull();
    expect(stripe.transfers.createReversal).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("caps transfer reversal at artist earnings for full dispute", async () => {
    vi.mocked(resolveOrderForDispute).mockResolvedValueOnce(ORDER);
    const supabase = buildSupabase(null);
    const createReversal = vi.fn(async () => ({ id: "trr_1" }));
    const stripe = {
      charges: {
        retrieve: vi.fn(async () => ({
          amount: 2000,
          transfer: { id: "tr_1", amount: 2000 },
        })),
      },
      transfers: {
        createReversal,
        retrieve: vi.fn(async () => ({ amount: 2000 })),
      },
    };

    const result = await handleDestinationChargeDisputeCreated(
      supabase as never,
      stripe as never,
      {
        id: "du_full",
        amount: 2000,
        status: "needs_response",
        payment_intent: "pi_1",
        charge: "ch_1",
      } as Stripe.Dispute,
      "evt_2",
    );

    expect(result.deferred).toBe(false);
    expect(result.orderId).toBe("order-1");
    expect(createReversal).toHaveBeenCalledWith(
      "tr_1",
      expect.objectContaining({ amount: 1800 }),
      expect.objectContaining({ idempotencyKey: "dispute-reversal-du_full" }),
    );
  });

  it("duplicate webhook short-circuits before createReversal", async () => {
    const supabase = buildSupabase({
      id: "row-dup",
      order_id: ORDER.id,
      stripe_transfer_reversal_id: "trr_existing",
      livecircuit_status: "open",
      metadata: { reversal_amount_cents: 1800 },
    });
    const stripe = { transfers: { createReversal: vi.fn() }, charges: { retrieve: vi.fn() } };

    const result = await handleDestinationChargeDisputeCreated(
      supabase as never,
      stripe as never,
      {
        id: "du_dup",
        amount: 2000,
        status: "needs_response",
        payment_intent: "pi_1",
        charge: "ch_1",
      } as Stripe.Dispute,
      "evt_dup",
    );

    expect(result.duplicate).toBe(true);
    expect(stripe.transfers.createReversal).not.toHaveBeenCalled();
    expect(resolveOrderForDispute).not.toHaveBeenCalled();
  });
});

describe("DisputeDeferredError", () => {
  it("uses deferred: prefix for webhook retry detection", () => {
    expect(new DisputeDeferredError().message).toBe("deferred:pending_order_resolution");
  });
});
