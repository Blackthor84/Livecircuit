import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminNotification } from "@/lib/monetization/admin-notifications.service";

export type PaymentRecordInput = {
  orderId?: string | null;
  userId?: string | null;
  purchaseType: string;
  status?: "pending" | "completed" | "failed" | "refunded" | "disputed" | "partially_refunded";
  subtotalCents: number;
  platformFeeCents?: number;
  discountCents?: number;
  taxCents?: number;
  totalCents: number;
  currency?: string;
  couponId?: string | null;
  couponCode?: string | null;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeEventId?: string | null;
  receiptUrl?: string | null;
  metadata?: Record<string, unknown>;
};

export async function recordPayment(
  supabase: SupabaseClient,
  input: PaymentRecordInput
): Promise<string | null> {
  if (input.stripeCheckoutSessionId) {
    const { data: existing } = await supabase
      .from("monetization_payment_records")
      .select("id")
      .eq("stripe_checkout_session_id", input.stripeCheckoutSessionId)
      .maybeSingle();
    if (existing) return existing.id as string;
  }

  const { data, error } = await supabase
    .from("monetization_payment_records")
    .insert({
      order_id: input.orderId ?? null,
      user_id: input.userId ?? null,
      purchase_type: input.purchaseType,
      status: input.status ?? "completed",
      subtotal_cents: input.subtotalCents,
      platform_fee_cents: input.platformFeeCents ?? 0,
      discount_cents: input.discountCents ?? 0,
      tax_cents: input.taxCents ?? 0,
      total_cents: input.totalCents,
      currency: input.currency ?? "USD",
      coupon_id: input.couponId ?? null,
      coupon_code: input.couponCode ?? null,
      stripe_checkout_session_id: input.stripeCheckoutSessionId ?? null,
      stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
      stripe_event_id: input.stripeEventId ?? null,
      receipt_url: input.receiptUrl ?? null,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("[financial-ledger] payment record", error.message);
    return null;
  }

  await appendLedgerEntry(supabase, {
    entryType: "payment",
    direction: "credit",
    amountCents: input.totalCents,
    currency: input.currency ?? "USD",
    orderId: input.orderId,
    userId: input.userId,
    stripeEventId: input.stripeEventId,
    stripePaymentIntentId: input.stripePaymentIntentId,
    stripeCheckoutSessionId: input.stripeCheckoutSessionId,
    category: input.purchaseType,
    description: `Payment received: ${input.purchaseType}`,
    metadata: { payment_record_id: data.id, ...input.metadata },
  });

  if (input.platformFeeCents && input.platformFeeCents > 0) {
    await appendLedgerEntry(supabase, {
      entryType: "fee",
      direction: "credit",
      amountCents: input.platformFeeCents,
      currency: input.currency ?? "USD",
      orderId: input.orderId,
      userId: input.userId,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
      category: "platform_fee",
      description: "Platform fee",
      metadata: { payment_record_id: data.id },
    });
  }

  return data.id as string;
}

export async function appendLedgerEntry(
  supabase: SupabaseClient,
  input: {
    entryType: string;
    direction: "credit" | "debit";
    amountCents: number;
    currency?: string;
    orderId?: string | null;
    userId?: string | null;
    stripeEventId?: string | null;
    stripePaymentIntentId?: string | null;
    stripeCheckoutSessionId?: string | null;
    category?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }
) {
  await supabase.from("monetization_financial_ledger").insert({
    entry_type: input.entryType,
    direction: input.direction,
    amount_cents: input.amountCents,
    currency: input.currency ?? "USD",
    order_id: input.orderId ?? null,
    user_id: input.userId ?? null,
    stripe_event_id: input.stripeEventId ?? null,
    stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
    stripe_checkout_session_id: input.stripeCheckoutSessionId ?? null,
    category: input.category ?? "general",
    description: input.description ?? null,
    metadata: input.metadata ?? {},
  });
}

export type CouponRedemptionInput = {
  couponId: string;
  userId?: string | null;
  orderId?: string | null;
  paymentRecordId?: string | null;
  discountCents: number;
  campaign?: string | null;
  referralSource?: string | null;
  promotion?: string | null;
  stripeEventId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function recordCouponRedemption(
  supabase: SupabaseClient,
  input: CouponRedemptionInput
): Promise<{ duplicate: boolean }> {
  if (input.orderId) {
    const { data: existing } = await supabase
      .from("monetization_coupon_redemptions")
      .select("id")
      .eq("order_id", input.orderId)
      .maybeSingle();
    if (existing) return { duplicate: true };
  }

  const { error } = await supabase.from("monetization_coupon_redemptions").insert({
    coupon_id: input.couponId,
    user_id: input.userId ?? null,
    order_id: input.orderId ?? null,
    payment_record_id: input.paymentRecordId ?? null,
    discount_cents: input.discountCents,
    campaign: input.campaign ?? null,
    referral_source: input.referralSource ?? null,
    promotion: input.promotion ?? null,
    stripe_event_id: input.stripeEventId ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    if (error.code === "23505") return { duplicate: true };
    console.error("[financial-ledger] coupon redemption", error.message);
    return { duplicate: false };
  }

  const { data: coupon } = await supabase
    .from("monetization_coupons")
    .select("usage_count, code")
    .eq("id", input.couponId)
    .single();

  if (coupon) {
    await supabase
      .from("monetization_coupons")
      .update({ usage_count: Number(coupon.usage_count ?? 0) + 1 })
      .eq("id", input.couponId);
  }

  return { duplicate: false };
}

export async function recordStripeWebhookEvent(
  supabase: SupabaseClient,
  input: {
    stripeEventId: string;
    eventType: string;
    status: "processed" | "failed" | "duplicate" | "ignored";
    payload?: Record<string, unknown>;
    errorMessage?: string | null;
    orderId?: string | null;
  }
): Promise<{ duplicate: boolean }> {
  const { error } = await supabase.from("monetization_stripe_webhook_events").insert({
    stripe_event_id: input.stripeEventId,
    event_type: input.eventType,
    status: input.status,
    payload: input.payload ?? {},
    error_message: input.errorMessage ?? null,
    order_id: input.orderId ?? null,
  });

  if (error?.code === "23505") return { duplicate: true };

  if (input.status === "failed") {
    await createAdminNotification(supabase, {
      category: "stripe_webhook_fail",
      title: `Stripe webhook failed: ${input.eventType}`,
      message: input.errorMessage ?? "Unknown webhook processing error",
      severity: "error",
      priority: "high",
      entityKey: input.stripeEventId,
    });
  }

  return { duplicate: false };
}

export async function recordRefund(
  supabase: SupabaseClient,
  input: {
    orderId?: string | null;
    userId?: string | null;
    amountCents: number;
    stripeEventId?: string | null;
    stripePaymentIntentId?: string | null;
    reason?: string;
  }
) {
  await appendLedgerEntry(supabase, {
    entryType: "refund",
    direction: "debit",
    amountCents: input.amountCents,
    orderId: input.orderId,
    userId: input.userId,
    stripeEventId: input.stripeEventId,
    stripePaymentIntentId: input.stripePaymentIntentId,
    category: "refund",
    description: input.reason ?? "Refund processed",
  });

  if (input.stripePaymentIntentId) {
    await supabase
      .from("monetization_payment_records")
      .update({ status: "refunded", updated_at: new Date().toISOString() })
      .eq("stripe_payment_intent_id", input.stripePaymentIntentId);
  }

  await createAdminNotification(supabase, {
    category: "refund_request",
    title: "Refund processed",
    message: input.reason ?? `Refund of $${(input.amountCents / 100).toFixed(2)}`,
    severity: "warning",
    entityKey: input.orderId ?? undefined,
  });
}

export async function recordDispute(
  supabase: SupabaseClient,
  input: {
    orderId?: string | null;
    userId?: string | null;
    amountCents: number;
    stripeEventId?: string | null;
    stripePaymentIntentId?: string | null;
    reason?: string;
  }
) {
  await appendLedgerEntry(supabase, {
    entryType: "dispute",
    direction: "debit",
    amountCents: input.amountCents,
    orderId: input.orderId,
    userId: input.userId,
    stripeEventId: input.stripeEventId,
    stripePaymentIntentId: input.stripePaymentIntentId,
    category: "chargeback",
    description: input.reason ?? "Payment dispute",
  });

  if (input.stripePaymentIntentId) {
    await supabase
      .from("monetization_payment_records")
      .update({ status: "disputed", updated_at: new Date().toISOString() })
      .eq("stripe_payment_intent_id", input.stripePaymentIntentId);
  }

  await createAdminNotification(supabase, {
    category: "chargeback",
    title: "Chargeback / dispute opened",
    message: input.reason ?? `Dispute for $${(input.amountCents / 100).toFixed(2)}`,
    severity: "error",
    priority: "urgent",
    entityKey: input.orderId ?? undefined,
  });
}
