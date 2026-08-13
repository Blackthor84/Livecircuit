import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { isStripeConfigured } from "@/lib/config/env";
import { recordRefund } from "@/lib/monetization/financial-ledger.service";
import { proportionalTicketRefundSplit } from "@/lib/monetization/ticket-revenue-split";
import { reverseArtistTicketSale } from "@/lib/services/artist-balance.service";
import { createNotification } from "@/lib/services/notifications.service";
import { getStripe } from "@/lib/stripe/server";

type OrderRefundRow = {
  id: string;
  user_id: string;
  artist_id: string | null;
  status: string;
  stripe_payment_intent_id: string | null;
  order_type: string;
  total_cents: number;
  gross_cents: number | null;
  platform_fee_cents: number;
  artist_earnings_cents: number;
  refund_cents: number;
  metadata: Record<string, unknown> | null;
};

export type ProcessOrderRefundInput = {
  orderId: string;
  /** When true, creates a Stripe refund before updating local records (admin-initiated). */
  createStripeRefund?: boolean;
  stripeRefundAmountCents?: number;
  stripeEventId?: string | null;
  stripeRefundId?: string | null;
  reason?: string | null;
  adminId?: string | null;
  notifyUser?: boolean;
};

export type ProcessOrderRefundResult =
  | { ok: true; alreadyRefunded: boolean }
  | { ok: false; error: string };

export function isDestinationChargeTicketOrder(order: OrderRefundRow): boolean {
  const existingMeta = order.metadata ?? {};
  return (
    order.order_type === "ticket" &&
    Boolean(order.artist_id) &&
    order.artist_earnings_cents > 0 &&
    (existingMeta.ticket_revenue_split === true || order.gross_cents != null)
  );
}

/** Single refund path — keeps Stripe, order, tickets, and ledger in sync. */
export async function processOrderRefund(
  supabase: SupabaseClient,
  input: ProcessOrderRefundInput,
): Promise<ProcessOrderRefundResult> {
  const { data: orderRaw } = await supabase
    .from("orders")
    .select(
      "id, user_id, artist_id, status, stripe_payment_intent_id, order_type, total_cents, gross_cents, platform_fee_cents, artist_earnings_cents, refund_cents, metadata",
    )
    .eq("id", input.orderId)
    .maybeSingle();

  const order = orderRaw as OrderRefundRow | null;
  if (!order) return { ok: false, error: "Order not found" };

  const grossCents = order.gross_cents ?? order.total_cents;
  const requestedRefundCents = input.stripeRefundAmountCents ?? grossCents;
  const incrementalRefundCents = requestedRefundCents - (order.refund_cents ?? 0);

  if (incrementalRefundCents <= 0) {
    return { ok: true, alreadyRefunded: true };
  }

  if (order.status !== "paid" && order.status !== "refunded") {
    return { ok: false, error: "Only paid orders can be refunded" };
  }

  const paymentIntent = order.stripe_payment_intent_id;
  if (!paymentIntent) {
    return { ok: false, error: "No Stripe payment on this order" };
  }

  const destinationTicket = isDestinationChargeTicketOrder(order);
  const refundReferenceId =
    input.stripeRefundId ??
    input.stripeEventId ??
    `refund:${order.id}:${requestedRefundCents}`;

  if (input.createStripeRefund) {
    if (!isStripeConfigured()) {
      return { ok: false, error: "Stripe is not configured" };
    }
    try {
      const stripe = getStripe();
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntent,
        reason: "requested_by_customer",
        metadata: {
          order_id: order.id,
          admin_id: input.adminId ?? "",
          note: input.reason ?? "",
        },
      };

      const fullRefund = requestedRefundCents >= grossCents;
      if (!fullRefund) {
        refundParams.amount = incrementalRefundCents;
      }

      if (destinationTicket) {
        refundParams.reverse_transfer = true;
        refundParams.refund_application_fee = true;
      }

      await stripe.refunds.create(refundParams);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Stripe refund failed" };
    }
  }

  const refundAmountCents = incrementalRefundCents;
  const fullRefund = (order.refund_cents ?? 0) + refundAmountCents >= grossCents;
  const existingMeta = order.metadata ?? {};

  await supabase
    .from("orders")
    .update({
      status: fullRefund ? "refunded" : order.status,
      metadata: {
        ...existingMeta,
        refunded_at: new Date().toISOString(),
        refund_reason: input.reason ?? null,
        refunded_by: input.adminId ?? null,
      },
    })
    .eq("id", order.id);

  if (destinationTicket) {
    await reverseArtistTicketSale(
      supabase,
      order.id,
      refundAmountCents,
      fullRefund,
      refundReferenceId,
    );
  } else {
    await supabase
      .from("orders")
      .update({
        refund_cents: (order.refund_cents ?? 0) + refundAmountCents,
        artist_payout_status: fullRefund ? "refunded" : "partially_refunded",
      })
      .eq("id", order.id);
  }

  if (fullRefund) {
    await invalidateTicketsForOrder(supabase, order.id, order.order_type);
  }

  const reversal =
    order.artist_earnings_cents > 0
      ? proportionalTicketRefundSplit({
          grossCents,
          platformFeeCents: order.platform_fee_cents,
          artistEarningsCents: order.artist_earnings_cents,
          refundCents: refundAmountCents,
        })
      : null;

  await recordRefund(supabase, {
    orderId: order.id,
    userId: order.user_id,
    amountCents: refundAmountCents,
    stripePaymentIntentId: paymentIntent,
    stripeEventId: input.stripeEventId ?? null,
    reason: input.reason ?? "Refund processed",
    artistReversalCents: reversal?.artistReversalCents,
    platformReversalCents: reversal?.platformReversalCents,
  });

  if (input.notifyUser !== false) {
    await createNotification({
      userId: order.user_id,
      type: "system",
      title: "Refund processed",
      body: "Your payment has been refunded. It may take several days to appear on your statement.",
      link: "/dashboard",
    });
  }

  return { ok: true, alreadyRefunded: false };
}

export async function processRefundByPaymentIntent(
  supabase: SupabaseClient,
  input: {
    stripePaymentIntentId: string;
    amountCents: number;
    stripeEventId?: string | null;
    stripeRefundId?: string | null;
    reason?: string;
  },
): Promise<ProcessOrderRefundResult | { ok: true; skipped: true; reason: string }> {
  const { data: orderRaw } = await supabase
    .from("orders")
    .select("id, refund_cents, gross_cents, total_cents, status")
    .eq("stripe_payment_intent_id", input.stripePaymentIntentId)
    .maybeSingle();

  if (!orderRaw?.id) {
    await recordRefund(supabase, {
      amountCents: input.amountCents,
      stripePaymentIntentId: input.stripePaymentIntentId,
      stripeEventId: input.stripeEventId ?? null,
      reason: input.reason ?? "Stripe charge refunded (order not linked)",
    });
    return { ok: true, skipped: true, reason: "No matching order" };
  }

  const alreadyRefunded = Number(orderRaw.refund_cents ?? 0);
  if (input.amountCents - alreadyRefunded <= 0) {
    return { ok: true, alreadyRefunded: true };
  }

  return processOrderRefund(supabase, {
    orderId: orderRaw.id as string,
    stripeRefundAmountCents: input.amountCents,
    stripeEventId: input.stripeEventId ?? null,
    stripeRefundId: input.stripeRefundId ?? input.stripeEventId ?? null,
    reason: input.reason ?? "Stripe charge refunded",
    notifyUser: true,
  });
}

async function invalidateTicketsForOrder(
  supabase: SupabaseClient,
  orderId: string,
  orderType: string,
) {
  if (orderType === "ticket") {
    await supabase.from("tickets").delete().eq("order_id", orderId);
  }
}
