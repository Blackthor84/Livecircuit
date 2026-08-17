import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import {
  calculateDisputeTransferReversalAmount,
  sumPriorDisputeReversalCents,
} from "@/lib/monetization/dispute-reversal";
import { recordDispute } from "@/lib/monetization/financial-ledger.service";
import {
  type DisputeOrderRow,
  resolveOrderForDispute,
} from "@/lib/services/dispute-order-resolution";

export type DisputeHandleResult = {
  duplicate: boolean;
  deferred: boolean;
  transferReversalId: string | null;
  stripeHandledAutomatically: boolean;
  orderId: string | null;
};

export class DisputeDeferredError extends Error {
  constructor(message = "deferred:pending_order_resolution") {
    super(message);
    this.name = "DisputeDeferredError";
  }
}

type ArtistDisputeRow = {
  id: string;
  order_id: string | null;
  stripe_transfer_reversal_id: string | null;
  livecircuit_status: string;
  metadata: Record<string, unknown> | null;
};

function isDisputeFinanciallyComplete(row: ArtistDisputeRow): boolean {
  if (!row.order_id) return false;
  if (row.livecircuit_status === "pending_order_resolution") return false;
  return true;
}

async function loadPriorDisputeReversals(
  supabase: SupabaseClient,
  orderId: string,
  excludeDisputeId: string,
): Promise<number> {
  const { data } = await supabase
    .from("artist_disputes")
    .select("metadata, stripe_transfer_reversal_id")
    .eq("order_id", orderId)
    .neq("stripe_dispute_id", excludeDisputeId);

  return sumPriorDisputeReversalCents(data ?? []);
}

async function applyDisputeHoldAndReversal(
  supabase: SupabaseClient,
  stripe: Stripe,
  dispute: Stripe.Dispute,
  stripeEventId: string,
  order: DisputeOrderRow,
  existingRow: ArtistDisputeRow | null,
): Promise<{
  transferReversalId: string | null;
  failureReason: string | null;
  stripeTransferId: string | null;
  reversalAmountCents: number;
}> {
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;

  if (existingRow?.stripe_transfer_reversal_id) {
    const priorCents =
      typeof existingRow.metadata?.reversal_amount_cents === "number"
        ? existingRow.metadata.reversal_amount_cents
        : 0;
    return {
      transferReversalId: existingRow.stripe_transfer_reversal_id,
      failureReason: null,
      stripeTransferId: (order.stripe_transfer_id as string | null) ?? null,
      reversalAmountCents: priorCents,
    };
  }

  await supabase.rpc("hold_artist_order_earnings", {
    p_order_id: order.id,
    p_reason: "dispute",
  });

  let transferReversalId: string | null = null;
  let failureReason: string | null = null;
  let stripeTransferId = (order.stripe_transfer_id as string | null) ?? null;
  let reversalAmountCents = 0;

  if (!chargeId) {
    return { transferReversalId, failureReason, stripeTransferId, reversalAmountCents };
  }

  try {
    const charge = await stripe.charges.retrieve(chargeId, { expand: ["transfer"] });
    const transfer = charge.transfer;
    const transferId =
      stripeTransferId ?? (typeof transfer === "string" ? transfer : transfer?.id ?? null);

    if (transferId && charge.amount > 0) {
      const transferObj =
        typeof transfer === "object" && transfer ? transfer : await stripe.transfers.retrieve(transferId);

      const priorDisputeReversalCents = await loadPriorDisputeReversals(
        supabase,
        order.id,
        dispute.id,
      );

      const grossCents = Number(order.gross_cents ?? order.total_cents ?? charge.amount);
      const platformFeeCents = Number(order.platform_fee_cents ?? 0);
      const artistEarningsCents = Number(order.artist_earnings_cents ?? 0);

      const reversalAmount = calculateDisputeTransferReversalAmount({
        chargeAmountCents: charge.amount,
        transferAmountCents: transferObj.amount,
        disputeAmountCents: dispute.amount,
        grossCents,
        platformFeeCents,
        artistEarningsCents,
        priorRefundCents: Number(order.refund_cents ?? 0),
        priorDisputeReversalCents,
      });

      reversalAmountCents = reversalAmount;

      if (reversalAmount > 0) {
        const reversal = await stripe.transfers.createReversal(
          transferId,
          {
            amount: reversalAmount,
            metadata: {
              dispute_id: dispute.id,
              order_id: order.id,
              stripe_event_id: stripeEventId,
              artist_reversal_cents: String(reversalAmount),
            },
          },
          { idempotencyKey: `dispute-reversal-${dispute.id}` },
        );
        transferReversalId = reversal.id;
        stripeTransferId = transferId;
      }
    }
  } catch (e) {
    failureReason = e instanceof Error ? e.message : "Transfer reversal failed";
    console.error("[dispute] transfer reversal", dispute.id, failureReason);
  }

  return { transferReversalId, failureReason, stripeTransferId, reversalAmountCents };
}

async function upsertArtistDispute(
  supabase: SupabaseClient,
  input: {
    dispute: Stripe.Dispute;
    stripeEventId: string;
    order: DisputeOrderRow | null;
    transferReversalId: string | null;
    stripeTransferId: string | null;
    failureReason: string | null;
    livecircuitStatus: string;
    reversalAmountCents?: number | null;
  },
): Promise<void> {
  const piId =
    typeof input.dispute.payment_intent === "string"
      ? input.dispute.payment_intent
      : input.dispute.payment_intent?.id;
  const chargeId =
    typeof input.dispute.charge === "string" ? input.dispute.charge : input.dispute.charge?.id;

  const metadata = {
    stripe_event_id: input.stripeEventId,
    reason: input.dispute.reason ?? null,
    ...(input.reversalAmountCents != null
      ? { reversal_amount_cents: input.reversalAmountCents }
      : {}),
  };

  const { data: existing } = await supabase
    .from("artist_disputes")
    .select("id")
    .eq("stripe_dispute_id", input.dispute.id)
    .maybeSingle();

  const row = {
    order_id: input.order?.id ?? null,
    artist_id: input.order?.artist_id ?? null,
    stripe_dispute_id: input.dispute.id,
    stripe_charge_id: chargeId ?? null,
    stripe_payment_intent_id: piId ?? null,
    stripe_transfer_id: input.stripeTransferId,
    stripe_transfer_reversal_id: input.transferReversalId,
    amount_cents: input.dispute.amount,
    stripe_dispute_status: input.dispute.status,
    livecircuit_status: input.livecircuitStatus,
    failure_reason: input.failureReason,
    metadata,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    await supabase.from("artist_disputes").update(row).eq("id", existing.id);
  } else {
    await supabase.from("artist_disputes").insert(row);
  }
}

/**
 * Destination-charge disputes (official Stripe behavior):
 * - Platform balance is debited for dispute amount + dispute fee.
 * - Platform must reverse the connected-account transfer to recover artist share.
 * - Stripe does NOT auto-reverse the destination transfer on dispute.created.
 */
export async function handleDestinationChargeDisputeCreated(
  supabase: SupabaseClient,
  stripe: Stripe,
  dispute: Stripe.Dispute,
  stripeEventId: string,
): Promise<DisputeHandleResult> {
  const { data: existing } = await supabase
    .from("artist_disputes")
    .select("id, order_id, stripe_transfer_reversal_id, livecircuit_status, metadata")
    .eq("stripe_dispute_id", dispute.id)
    .maybeSingle();

  const existingRow = (existing as ArtistDisputeRow | null) ?? null;

  if (existingRow && isDisputeFinanciallyComplete(existingRow)) {
    return {
      duplicate: true,
      deferred: false,
      transferReversalId: existingRow.stripe_transfer_reversal_id,
      stripeHandledAutomatically: false,
      orderId: existingRow.order_id,
    };
  }

  const order = await resolveOrderForDispute(supabase, stripe, dispute);

  if (!order) {
    await upsertArtistDispute(supabase, {
      dispute,
      stripeEventId,
      order: null,
      transferReversalId: null,
      stripeTransferId: null,
      failureReason: null,
      livecircuitStatus: "pending_order_resolution",
    });

    return {
      duplicate: false,
      deferred: true,
      transferReversalId: null,
      stripeHandledAutomatically: false,
      orderId: null,
    };
  }

  const { transferReversalId, failureReason, stripeTransferId, reversalAmountCents } =
    await applyDisputeHoldAndReversal(
    supabase,
    stripe,
    dispute,
    stripeEventId,
    order,
    existingRow,
  );

  await upsertArtistDispute(supabase, {
    dispute,
    stripeEventId,
    order,
    transferReversalId,
    stripeTransferId,
    failureReason,
    livecircuitStatus: "open",
    reversalAmountCents: transferReversalId ? reversalAmountCents : null,
  });

  const piId =
    typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;
  await recordDispute(supabase, {
    orderId: order.id,
    amountCents: dispute.amount,
    stripePaymentIntentId: piId ?? null,
    stripeEventId: dispute.id,
    reason: dispute.reason ?? "Payment dispute opened",
  });

  return {
    duplicate: false,
    deferred: false,
    transferReversalId,
    stripeHandledAutomatically: false,
    orderId: order.id,
  };
}

/**
 * Complete disputes that arrived before order linkage was available locally.
 */
export async function resolvePendingDisputesForOrder(
  supabase: SupabaseClient,
  stripe: Stripe,
  orderId: string,
): Promise<number> {
  const { data: orderRaw } = await supabase
    .from("orders")
    .select(
      "id, artist_id, stripe_transfer_id, gross_cents, platform_fee_cents, artist_earnings_cents, order_type, metadata, refund_cents, total_cents, status, stripe_payment_intent_id, stripe_checkout_session_id",
    )
    .eq("id", orderId)
    .maybeSingle();

  const order = orderRaw as DisputeOrderRow | null;
  if (!order?.stripe_payment_intent_id) return 0;

  const { data: pendingRows } = await supabase
    .from("artist_disputes")
    .select("stripe_dispute_id, livecircuit_status, order_id, metadata")
    .eq("stripe_payment_intent_id", order.stripe_payment_intent_id)
    .or("livecircuit_status.eq.pending_order_resolution,order_id.is.null");

  let resolved = 0;
  for (const row of pendingRows ?? []) {
    if (row.order_id && row.livecircuit_status !== "pending_order_resolution") continue;

    const dispute = await stripe.disputes.retrieve(row.stripe_dispute_id as string);
    const stripeEventId =
      (row.metadata as { stripe_event_id?: string } | null)?.stripe_event_id ?? `resolve:${dispute.id}`;
    const result = await handleDestinationChargeDisputeCreated(
      supabase,
      stripe,
      dispute,
      stripeEventId,
    );

    if (!result.deferred && result.orderId) {
      resolved += 1;
    }
  }

  return resolved;
}

export async function handleDestinationChargeDisputeClosed(
  supabase: SupabaseClient,
  stripe: Stripe,
  dispute: Stripe.Dispute,
): Promise<void> {
  const { data: row } = await supabase
    .from("artist_disputes")
    .select("id, order_id, stripe_transfer_id, stripe_transfer_reversal_id, amount_cents")
    .eq("stripe_dispute_id", dispute.id)
    .maybeSingle();

  if (row) {
    await supabase
      .from("artist_disputes")
      .update({
        stripe_dispute_status: dispute.status,
        livecircuit_status: dispute.status === "won" ? "won" : "lost",
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
  }

  const piId =
    typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;
  if (!piId) return;

  const order =
    (await resolveOrderForDispute(supabase, stripe, dispute)) ??
    ((
      await supabase
        .from("orders")
        .select(
          "id, artist_payout_status, artist_id, gross_cents, platform_fee_cents, artist_earnings_cents, order_type, metadata, refund_cents, total_cents, stripe_payment_intent_id, status",
        )
        .eq("stripe_payment_intent_id", piId)
        .maybeSingle()
    ).data as DisputeOrderRow | null);

  if (!order?.id) return;

  if (dispute.status === "won") {
    await supabase
      .from("orders")
      .update({ artist_payout_status: "pending" })
      .eq("id", order.id)
      .eq("artist_payout_status", "held");

    const reversalId = row?.stripe_transfer_reversal_id as string | null;
    const transferId = row?.stripe_transfer_id as string | null;
    if (reversalId && transferId && order.artist_id) {
      try {
        const { data: artist } = await supabase
          .from("artists")
          .select("stripe_account_id")
          .eq("id", order.artist_id)
          .maybeSingle();

        const destination = artist?.stripe_account_id as string | undefined;
        if (destination) {
          const grossCents = Number(order.gross_cents ?? order.total_cents ?? dispute.amount);
          const artistShare = Number(order.artist_earnings_cents ?? 0);
          const retransferAmount =
            grossCents > 0
              ? Math.min(artistShare, Math.round((artistShare * dispute.amount) / grossCents))
              : artistShare;

          if (retransferAmount > 0) {
            await stripe.transfers.create(
              {
                amount: retransferAmount,
                currency: dispute.currency,
                destination,
                metadata: {
                  dispute_id: dispute.id,
                  order_id: order.id,
                  reason: "dispute_won_retransfer",
                },
              },
              { idempotencyKey: `dispute-won-retransfer-${dispute.id}` },
            );
          }
        }
      } catch (e) {
        console.error("[dispute] won re-transfer failed", dispute.id, e);
      }
    }
    return;
  }

  if (dispute.status === "lost") {
    await supabase
      .from("orders")
      .update({ artist_payout_status: "refunded", status: "refunded" })
      .eq("id", order.id);

    if (
      order.order_type === "ticket" &&
      order.artist_id &&
      Number(order.artist_earnings_cents ?? 0) > 0
    ) {
      await supabase.rpc("reverse_artist_ticket_sale", {
        p_order_id: order.id,
        p_refund_cents: Number(order.gross_cents ?? order.total_cents ?? dispute.amount),
        p_full_refund: true,
        p_reference_id: `dispute-lost:${dispute.id}`,
      });
    }
  }
}
