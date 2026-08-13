import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type ReconciliationIssue = {
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
  orderId?: string;
  artistId?: string;
  payoutId?: string;
  metadata?: Record<string, unknown>;
};

export type ReconciliationReport = {
  scannedOrders: number;
  scannedPayouts: number;
  issues: ReconciliationIssue[];
  summary: {
    grossTicketCents: number;
    platformFeeCents: number;
    artistEarningsCents: number;
    stripeFeeCents: number;
    pendingArtistCents: number;
    availableArtistCents: number;
    receivableArtistCents: number;
  };
};

export async function runFinancialReconciliation(
  supabase: SupabaseClient,
  options?: { limit?: number },
): Promise<ReconciliationReport> {
  const limit = options?.limit ?? 500;
  const issues: ReconciliationIssue[] = [];

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, artist_id, order_type, status, gross_cents, platform_fee_cents, artist_earnings_cents, stripe_fee_cents, total_cents, stripe_payment_intent_id, stripe_balance_transaction_id, refund_cents, artist_payout_status",
    )
    .eq("order_type", "ticket")
    .eq("status", "paid")
    .not("gross_cents", "is", null)
    .limit(limit);

  let grossTicketCents = 0;
  let platformFeeCents = 0;
  let artistEarningsCents = 0;
  let stripeFeeCents = 0;

  for (const order of orders ?? []) {
    const gross = Number(order.gross_cents ?? 0);
    const platform = Number(order.platform_fee_cents ?? 0);
    const artist = Number(order.artist_earnings_cents ?? 0);
    const stripeFee = Number(order.stripe_fee_cents ?? 0);

    grossTicketCents += gross;
    platformFeeCents += platform;
    artistEarningsCents += artist;
    if (order.stripe_fee_cents != null) stripeFeeCents += stripeFee;

    if (gross !== platform + artist) {
      issues.push({
        code: "ticket_split_mismatch",
        severity: "error",
        message: `Order gross ${gross} != platform ${platform} + artist ${artist}`,
        orderId: order.id as string,
      });
    }

    if (gross > 0 && !order.stripe_payment_intent_id) {
      issues.push({
        code: "missing_stripe_payment_intent",
        severity: "error",
        message: "Paid ticket order missing stripe_payment_intent_id",
        orderId: order.id as string,
      });
    }

    if (gross > 0 && order.stripe_fee_cents == null) {
      issues.push({
        code: "missing_stripe_fee",
        severity: "warning",
        message: "Paid ticket order missing stripe_fee_cents reconciliation",
        orderId: order.id as string,
      });
    }
  }

  const { data: payouts } = await supabase
    .from("artist_payouts")
    .select("id, artist_id, amount_cents, status, stripe_payout_id, idempotency_key")
    .limit(limit);

  const payoutKeyCounts = new Map<string, number>();
  for (const payout of payouts ?? []) {
    const key = payout.idempotency_key as string | null;
    if (key) payoutKeyCounts.set(key, (payoutKeyCounts.get(key) ?? 0) + 1);
    if (payout.status === "paid" && !payout.stripe_payout_id) {
      issues.push({
        code: "paid_payout_missing_stripe_id",
        severity: "error",
        message: "Paid payout record missing stripe_payout_id",
        payoutId: payout.id as string,
        artistId: payout.artist_id as string,
      });
    }
  }

  for (const [key, count] of payoutKeyCounts) {
    if (count > 1) {
      issues.push({
        code: "duplicate_payout_idempotency",
        severity: "error",
        message: `Duplicate payout idempotency key: ${key}`,
        metadata: { count },
      });
    }
  }

  const { data: balances } = await supabase
    .from("artist_balances")
    .select("pending_cents, available_cents, receivable_cents");

  const summary = {
    grossTicketCents,
    platformFeeCents,
    artistEarningsCents,
    stripeFeeCents,
    pendingArtistCents: (balances ?? []).reduce((s, b) => s + Number(b.pending_cents ?? 0), 0),
    availableArtistCents: (balances ?? []).reduce((s, b) => s + Number(b.available_cents ?? 0), 0),
    receivableArtistCents: (balances ?? []).reduce((s, b) => s + Number(b.receivable_cents ?? 0), 0),
  };

  return {
    scannedOrders: orders?.length ?? 0,
    scannedPayouts: payouts?.length ?? 0,
    issues,
    summary,
  };
}
