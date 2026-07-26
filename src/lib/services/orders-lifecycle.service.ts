import type { SupabaseClient } from "@supabase/supabase-js";

export async function markOrderFailedByCheckoutSession(
  supabase: SupabaseClient,
  sessionId: string,
  reason: string
) {
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, metadata")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (!order || order.status === "paid") return;

  const meta = (order.metadata ?? {}) as Record<string, unknown>;
  await supabase
    .from("orders")
    .update({
      status: "failed",
      metadata: {
        ...meta,
        failure_reason: reason,
        failed_at: new Date().toISOString(),
      },
    })
    .eq("id", order.id);
}

export async function markOrderFailedByPaymentIntent(
  supabase: SupabaseClient,
  paymentIntentId: string,
  reason: string
) {
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, metadata")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (!order || order.status === "paid") return;

  const meta = (order.metadata ?? {}) as Record<string, unknown>;
  await supabase
    .from("orders")
    .update({
      status: "failed",
      metadata: {
        ...meta,
        failure_reason: reason,
        failed_at: new Date().toISOString(),
      },
    })
    .eq("id", order.id);
}
