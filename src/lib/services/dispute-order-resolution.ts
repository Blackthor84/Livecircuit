import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

export type DisputeOrderRow = {
  id: string;
  artist_id: string | null;
  stripe_transfer_id: string | null;
  gross_cents: number | null;
  platform_fee_cents: number | null;
  artist_earnings_cents: number | null;
  order_type: string;
  metadata: Record<string, unknown> | null;
  refund_cents: number | null;
  total_cents: number;
  status: string;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
};

export const DISPUTE_ORDER_SELECT =
  "id, artist_id, stripe_transfer_id, gross_cents, platform_fee_cents, artist_earnings_cents, order_type, metadata, refund_cents, total_cents, status, stripe_payment_intent_id, stripe_checkout_session_id";

export async function fetchOrderById(
  supabase: SupabaseClient,
  orderId: string,
): Promise<DisputeOrderRow | null> {
  const { data } = await supabase
    .from("orders")
    .select(DISPUTE_ORDER_SELECT)
    .eq("id", orderId)
    .maybeSingle();
  return (data as DisputeOrderRow | null) ?? null;
}

/**
 * Resolve a LiveCircuit order for a Stripe dispute without assuming webhook ordering.
 */
export async function resolveOrderForDispute(
  supabase: SupabaseClient,
  stripe: Stripe,
  dispute: Stripe.Dispute,
): Promise<DisputeOrderRow | null> {
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
  const piId =
    typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;

  if (chargeId) {
    try {
      const charge = await stripe.charges.retrieve(chargeId);
      if (charge.metadata?.order_id) {
        const order = await fetchOrderById(supabase, charge.metadata.order_id);
        if (order) return order;
      }
    } catch (e) {
      console.warn("[dispute] charge lookup failed", chargeId, e);
    }
  }

  if (piId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(piId);
      if (paymentIntent.metadata?.order_id) {
        const order = await fetchOrderById(supabase, paymentIntent.metadata.order_id);
        if (order) return order;
      }
    } catch (e) {
      console.warn("[dispute] payment intent lookup failed", piId, e);
    }
  }

  if (piId) {
    const { data: byPi } = await supabase
      .from("orders")
      .select(DISPUTE_ORDER_SELECT)
      .eq("stripe_payment_intent_id", piId)
      .maybeSingle();
    if (byPi) return byPi as DisputeOrderRow;
  }

  if (piId) {
    try {
      const sessions = await stripe.checkout.sessions.list({ payment_intent: piId, limit: 1 });
      const sessionId = sessions.data[0]?.id;
      if (sessionId) {
        const { data: bySession } = await supabase
          .from("orders")
          .select(DISPUTE_ORDER_SELECT)
          .eq("stripe_checkout_session_id", sessionId)
          .maybeSingle();
        if (bySession) return bySession as DisputeOrderRow;
      }
    } catch (e) {
      console.warn("[dispute] checkout session lookup failed", piId, e);
    }
  }

  if (chargeId) {
    const piFromCharge =
      typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;
    if (piFromCharge) {
      const { data: bySessionPi } = await supabase
        .from("orders")
        .select(DISPUTE_ORDER_SELECT)
        .eq("stripe_checkout_session_id", piFromCharge)
        .maybeSingle();
      if (bySessionPi) return bySessionPi as DisputeOrderRow;
    }
  }

  return null;
}
