import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";

async function resolveBalanceTransaction(
  stripe: Stripe,
  balanceTxn: Stripe.BalanceTransaction | string | null | undefined,
): Promise<Stripe.BalanceTransaction | null> {
  if (!balanceTxn) return null;
  if (typeof balanceTxn !== "string") return balanceTxn;
  return stripe.balanceTransactions.retrieve(balanceTxn);
}

export async function resolveOrderIdForStripeCharge(
  supabase: SupabaseClient,
  stripe: Stripe,
  charge: Stripe.Charge,
  hintedOrderId?: string | null,
): Promise<string | null> {
  if (hintedOrderId) return hintedOrderId;
  if (charge.metadata?.order_id) return charge.metadata.order_id;

  const piId =
    typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!piId) return null;

  const { data } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_payment_intent_id", piId)
    .maybeSingle();
  if (data?.id) return data.id as string;

  const paymentIntent = await stripe.paymentIntents.retrieve(piId);
  return paymentIntent.metadata?.order_id ?? null;
}

export async function reconcileOrderStripeFees(
  supabase: SupabaseClient,
  input: {
    orderId: string;
    paymentIntentId: string;
  },
): Promise<{ ok: boolean; stripeFeeCents: number | null }> {
  const stripe = getStripe();

  const paymentIntent = await stripe.paymentIntents.retrieve(input.paymentIntentId, {
    expand: ["latest_charge.balance_transaction", "latest_charge.transfer", "latest_charge.application_fee"],
  });

  const charge = paymentIntent.latest_charge;
  if (!charge || typeof charge === "string") {
    return { ok: false, stripeFeeCents: null };
  }

  const balanceTxn = await resolveBalanceTransaction(stripe, charge.balance_transaction);
  const stripeFeeCents = balanceTxn?.fee ?? null;

  const transferId =
    typeof charge.transfer === "string" ? charge.transfer : charge.transfer?.id ?? null;
  const applicationFeeId =
    typeof charge.application_fee === "string"
      ? charge.application_fee
      : charge.application_fee?.id ?? null;
  const balanceTransactionId = balanceTxn?.id ?? null;

  const { data: current } = await supabase
    .from("orders")
    .select(
      "stripe_fee_cents, stripe_balance_transaction_id, stripe_transfer_id, stripe_application_fee_id",
    )
    .eq("id", input.orderId)
    .maybeSingle();

  const patch: Record<string, unknown> = {};

  if (current?.stripe_fee_cents == null && stripeFeeCents != null) {
    patch.stripe_fee_cents = stripeFeeCents;
  }
  if (!current?.stripe_balance_transaction_id && balanceTransactionId) {
    patch.stripe_balance_transaction_id = balanceTransactionId;
  }
  if (!current?.stripe_transfer_id && transferId) {
    patch.stripe_transfer_id = transferId;
  }
  if (!current?.stripe_application_fee_id && applicationFeeId) {
    patch.stripe_application_fee_id = applicationFeeId;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: true, stripeFeeCents: current?.stripe_fee_cents ?? stripeFeeCents };
  }

  const { error } = await supabase.from("orders").update(patch).eq("id", input.orderId);

  if (error) {
    console.error("[stripe-fee-reconciliation]", error.message);
    return { ok: false, stripeFeeCents };
  }

  return { ok: true, stripeFeeCents: (patch.stripe_fee_cents as number | null) ?? stripeFeeCents };
}

export async function reconcileOrderStripeFeesFromCharge(
  supabase: SupabaseClient,
  charge: Stripe.Charge,
  orderId?: string | null,
  stripeClient?: Stripe,
): Promise<void> {
  const piId =
    typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!piId) return;

  const stripe = stripeClient ?? getStripe();
  const resolvedOrderId = await resolveOrderIdForStripeCharge(supabase, stripe, charge, orderId);
  if (!resolvedOrderId) return;

  await reconcileOrderStripeFees(supabase, {
    orderId: resolvedOrderId,
    paymentIntentId: piId,
  });
}
