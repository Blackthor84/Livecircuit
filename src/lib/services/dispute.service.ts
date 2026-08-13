import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

export type DisputeHandleResult = {
  duplicate: boolean;
  transferReversalId: string | null;
  stripeHandledAutomatically: boolean;
};

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
    .select("id, stripe_transfer_reversal_id")
    .eq("stripe_dispute_id", dispute.id)
    .maybeSingle();

  if (existing) {
    return {
      duplicate: true,
      transferReversalId: (existing.stripe_transfer_reversal_id as string | null) ?? null,
      stripeHandledAutomatically: false,
    };
  }

  const piId =
    typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;

  let orderId: string | null = null;
  let artistId: string | null = null;
  let stripeTransferId: string | null = null;

  if (piId) {
    const { data: order } = await supabase
      .from("orders")
      .select(
        "id, artist_id, stripe_transfer_id, gross_cents, platform_fee_cents, artist_earnings_cents, order_type, metadata, refund_cents, total_cents, status, stripe_payment_intent_id",
      )
      .eq("stripe_payment_intent_id", piId)
      .maybeSingle();

    if (order) {
      orderId = order.id as string;
      artistId = order.artist_id as string | null;
      stripeTransferId = (order.stripe_transfer_id as string | null) ?? null;
    }
  }

  if (orderId) {
    await supabase.rpc("hold_artist_order_earnings", {
      p_order_id: orderId,
      p_reason: "dispute",
    });
  }

  let transferReversalId: string | null = null;
  let failureReason: string | null = null;

  if (chargeId && orderId) {
    try {
      const charge = await stripe.charges.retrieve(chargeId, { expand: ["transfer"] });
      const transfer = charge.transfer;
      const transferId =
        stripeTransferId ??
        (typeof transfer === "string" ? transfer : transfer?.id ?? null);

      if (transferId && charge.amount > 0) {
        const transferObj =
          typeof transfer === "object" && transfer ? transfer : await stripe.transfers.retrieve(transferId);
        const reversalAmount = Math.min(
          transferObj.amount,
          Math.round((transferObj.amount * dispute.amount) / charge.amount),
        );

        if (reversalAmount > 0) {
          const reversal = await stripe.transfers.createReversal(
            transferId,
            {
              amount: reversalAmount,
              metadata: {
                dispute_id: dispute.id,
                order_id: orderId,
                stripe_event_id: stripeEventId,
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
  }

  await supabase.from("artist_disputes").insert({
    order_id: orderId,
    artist_id: artistId,
    stripe_dispute_id: dispute.id,
    stripe_charge_id: chargeId ?? null,
    stripe_payment_intent_id: piId ?? null,
    stripe_transfer_id: stripeTransferId,
    stripe_transfer_reversal_id: transferReversalId,
    amount_cents: dispute.amount,
    stripe_dispute_status: dispute.status,
    livecircuit_status: "open",
    failure_reason: failureReason,
    metadata: { stripe_event_id: stripeEventId, reason: dispute.reason ?? null },
  });

  return {
    duplicate: false,
    transferReversalId,
    stripeHandledAutomatically: false,
  };
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

  const { data: order } = await supabase
    .from("orders")
    .select("id, artist_payout_status, artist_id, gross_cents, platform_fee_cents, artist_earnings_cents, order_type, metadata, refund_cents, total_cents, stripe_payment_intent_id, status")
    .eq("stripe_payment_intent_id", piId)
    .maybeSingle();

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
