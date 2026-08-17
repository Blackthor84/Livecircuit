import { describe, expect, it, vi, beforeEach } from "vitest";
import type Stripe from "stripe";
import {
  GOLDEN_ORDER_ID,
  resolveOrphanedDispute,
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
import { recordDispute } from "@/lib/monetization/financial-ledger.service";

const ORDER = {
  id: "order-disp",
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

const ORPHAN_ROW = {
  id: "row-orphan",
  order_id: null,
  artist_id: null,
  stripe_dispute_id: "du_orphan",
  stripe_transfer_reversal_id: null,
  livecircuit_status: "open",
  metadata: { stripe_event_id: "evt_original" },
};

function buildSupabase(options: {
  disputeRow?: Record<string, unknown> | null;
  priorDisputes?: Array<Record<string, unknown>>;
  priorRefunds?: number;
  ledgerExisting?: boolean;
  orderOverride?: Partial<typeof ORDER>;
} = {}) {
  const rpc = vi.fn(async () => null);
  const updateEq = vi.fn(async () => ({ data: null, error: null }));
  const ledgerInsert = vi.fn(async () => ({ data: null, error: null }));

  const order = { ...ORDER, refund_cents: options.priorRefunds ?? 0, ...options.orderOverride };

  const from = vi.fn((table: string) => {
    if (table === "artist_disputes") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn((col: string, val: string) => ({
            maybeSingle: vi.fn(async () => {
              if (col === "id" || col === "stripe_dispute_id") {
                return { data: options.disputeRow === undefined ? ORPHAN_ROW : options.disputeRow };
              }
              return { data: null };
            }),
            neq: vi.fn(async () => ({ data: options.priorDisputes ?? [] })),
          })),
        })),
        insert: vi.fn(async () => ({ data: null, error: null })),
        update: vi.fn(() => ({ eq: updateEq })),
      };
    }
    if (table === "orders") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: order })),
          })),
        })),
      };
    }
    if (table === "monetization_financial_ledger") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn((_col: string, val: string) => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () =>
                options.ledgerExisting && val === "du_orphan" ? { data: { id: "ledger-1" } } : { data: null },
              ),
            })),
          })),
        })),
        insert: ledgerInsert,
      };
    }
    throw new Error(`unexpected table ${table}`);
  });

  return { from, rpc, updateEq, ledgerInsert };
}

function buildStripe(options: {
  livemode?: boolean;
  existingReversal?: { id: string; amount: number } | null;
  chargeAmount?: number;
  transferAmount?: number;
} = {}) {
  const createReversal = vi.fn(async () => ({ id: "trr_new" }));
  return {
    disputes: {
      retrieve: vi.fn(async () => ({
        id: "du_orphan",
        amount: 2000,
        status: "needs_response",
        livemode: options.livemode ?? false,
        payment_intent: "pi_1",
        charge: "ch_1",
        reason: "fraudulent",
      })),
    },
    charges: {
      retrieve: vi.fn(async () => ({
        amount: options.chargeAmount ?? 2000,
        transfer: { id: "tr_1", amount: options.transferAmount ?? 2000 },
      })),
    },
    transfers: {
      createReversal,
      retrieve: vi.fn(async () => ({ amount: options.transferAmount ?? 2000 })),
      listReversals: vi.fn(async () => ({
        data: options.existingReversal
          ? [{ id: options.existingReversal.id, amount: options.existingReversal.amount, metadata: { dispute_id: "du_orphan" } }]
          : [],
      })),
    },
    createReversal,
  };
}

describe("resolveOrphanedDispute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. resolves orphan when order is found via PaymentIntent metadata path", async () => {
    vi.mocked(resolveOrderForDispute).mockResolvedValueOnce(ORDER);
    const supabase = buildSupabase();
    const stripe = buildStripe();

    const result = await resolveOrphanedDispute(supabase as never, stripe as never, {
      disputeId: ORPHAN_ROW.id,
    });

    expect(resolveOrderForDispute).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect(result.orderId).toBe("order-disp");
    expect(stripe.transfers.createReversal).toHaveBeenCalledWith(
      "tr_1",
      expect.objectContaining({ amount: 1800 }),
      expect.objectContaining({ idempotencyKey: "dispute-reversal-du_orphan" }),
    );
  });

  it("2. resolves orphan when order is found via charge metadata path", async () => {
    vi.mocked(resolveOrderForDispute).mockResolvedValueOnce({
      ...ORDER,
      id: "order-from-charge",
    });
    const supabase = buildSupabase();
    const stripe = buildStripe();

    const result = await resolveOrphanedDispute(supabase as never, stripe as never, {
      disputeId: "du_orphan",
    });

    expect(result.orderId).toBe("order-from-charge");
    expect(stripe.transfers.createReversal).toHaveBeenCalled();
  });

  it("3. resolves orphan when order is found via orders.stripe_payment_intent_id", async () => {
    vi.mocked(resolveOrderForDispute).mockResolvedValueOnce({
      ...ORDER,
      id: "order-from-pi-column",
    });
    const supabase = buildSupabase();
    const stripe = buildStripe();

    const result = await resolveOrphanedDispute(supabase as never, stripe as never, {
      disputeId: "du_orphan",
    });

    expect(result.orderId).toBe("order-from-pi-column");
  });

  it("4. caps reversal at artist earnings (1800 on $20 ticket)", async () => {
    vi.mocked(resolveOrderForDispute).mockResolvedValueOnce(ORDER);
    const supabase = buildSupabase();
    const stripe = buildStripe();

    await resolveOrphanedDispute(supabase as never, stripe as never, {
      disputeId: ORPHAN_ROW.id,
    });

    expect(stripe.transfers.createReversal).toHaveBeenCalledWith(
      "tr_1",
      expect.objectContaining({ amount: 1800 }),
      expect.any(Object),
    );
  });

  it("5. prior refund reduces remaining exposure", async () => {
    vi.mocked(resolveOrderForDispute).mockResolvedValueOnce({
      ...ORDER,
      refund_cents: 500,
    });
    const supabase = buildSupabase({ priorRefunds: 500 });
    const stripe = buildStripe();

    await resolveOrphanedDispute(supabase as never, stripe as never, {
      disputeId: ORPHAN_ROW.id,
    });

    expect(stripe.transfers.createReversal).toHaveBeenCalledWith(
      "tr_1",
      expect.objectContaining({ amount: 1350 }),
      expect.any(Object),
    );
  });

  it("6. prior dispute reversal reduces remaining exposure", async () => {
    vi.mocked(resolveOrderForDispute).mockResolvedValueOnce(ORDER);
    const supabase = buildSupabase({
      priorDisputes: [
        {
          stripe_transfer_reversal_id: "trr_prior",
          metadata: { reversal_amount_cents: 900 },
        },
      ],
    });
    const stripe = buildStripe();

    await resolveOrphanedDispute(supabase as never, stripe as never, {
      disputeId: ORPHAN_ROW.id,
    });

    expect(stripe.transfers.createReversal).toHaveBeenCalledWith(
      "tr_1",
      expect.objectContaining({ amount: 900 }),
      expect.any(Object),
    );
  });

  it("7. already reversed dispute does not create another reversal", async () => {
    const supabase = buildSupabase({
      disputeRow: {
        ...ORPHAN_ROW,
        order_id: ORDER.id,
        stripe_transfer_reversal_id: "trr_existing",
        metadata: { reversal_amount_cents: 1800 },
      },
    });
    const stripe = buildStripe();

    const result = await resolveOrphanedDispute(supabase as never, stripe as never, {
      disputeId: ORPHAN_ROW.id,
    });

    expect(result.alreadyResolved).toBe(true);
    expect(stripe.transfers.createReversal).not.toHaveBeenCalled();
    expect(resolveOrderForDispute).not.toHaveBeenCalled();
  });

  it("8. unresolved order defers without reversal", async () => {
    vi.mocked(resolveOrderForDispute).mockResolvedValueOnce(null);
    const supabase = buildSupabase();
    const stripe = buildStripe();

    const result = await resolveOrphanedDispute(supabase as never, stripe as never, {
      disputeId: ORPHAN_ROW.id,
    });

    expect(result.deferred).toBe(true);
    expect(result.transferReversalId).toBeNull();
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(stripe.transfers.createReversal).not.toHaveBeenCalled();
  });

  it("9. rejects live-mode Stripe disputes", async () => {
    const supabase = buildSupabase();
    const stripe = buildStripe({ livemode: true });

    const result = await resolveOrphanedDispute(supabase as never, stripe as never, {
      disputeId: ORPHAN_ROW.id,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("live_mode_rejected");
    expect(resolveOrderForDispute).not.toHaveBeenCalled();
  });

  it("10. remediation is idempotent (ledger + Stripe reuse)", async () => {
    vi.mocked(resolveOrderForDispute).mockResolvedValueOnce(ORDER);
    const supabase = buildSupabase({ ledgerExisting: true });
    const stripe = buildStripe({
      existingReversal: { id: "trr_stripe_existing", amount: 1800 },
    });

    const result = await resolveOrphanedDispute(supabase as never, stripe as never, {
      disputeId: ORPHAN_ROW.id,
    });

    expect(result.transferReversalId).toBe("trr_stripe_existing");
    expect(stripe.transfers.createReversal).not.toHaveBeenCalled();
    expect(recordDispute).not.toHaveBeenCalled();
  });

  it("rejects golden order linkage", async () => {
    vi.mocked(resolveOrderForDispute).mockResolvedValueOnce({
      ...ORDER,
      id: GOLDEN_ORDER_ID,
    });
    const supabase = buildSupabase();
    const stripe = buildStripe();

    const result = await resolveOrphanedDispute(supabase as never, stripe as never, {
      disputeId: ORPHAN_ROW.id,
    });

    expect(result.code).toBe("golden_order_protected");
    expect(stripe.transfers.createReversal).not.toHaveBeenCalled();
  });

  it("rejects non-orphan rows linked to an order without reversal", async () => {
    const supabase = buildSupabase({
      disputeRow: {
        ...ORPHAN_ROW,
        order_id: ORDER.id,
        livecircuit_status: "open",
      },
    });
    const stripe = buildStripe();

    const result = await resolveOrphanedDispute(supabase as never, stripe as never, {
      disputeId: ORPHAN_ROW.id,
    });

    expect(result.code).toBe("not_orphan");
    expect(resolveOrderForDispute).not.toHaveBeenCalled();
  });
});
