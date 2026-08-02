import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { fulfillPaidOrder } from "@/lib/services/fulfillment.service";
import {
  markOrderFailedByCheckoutSession,
  markOrderFailedByPaymentIntent,
} from "@/lib/services/orders-lifecycle.service";
import {
  handleBackstageCheckoutSession,
  handleBackstageSubscriptionEvent,
} from "@/lib/services/backstage-stripe.service";
import { handleMarketplaceCheckoutSession } from "@/lib/services/marketplace.service";
import { handleLocalBusinessCampaignCheckout } from "@/lib/services/local-business.service";
import {
  recordDispute,
  recordRefund,
  recordStripeWebhookEvent,
} from "@/lib/monetization/financial-ledger.service";
import { createAdminNotification } from "@/lib/monetization/admin-notifications.service";

export async function processStripeWebhookEvent(
  supabase: SupabaseClient,
  stripe: Stripe,
  event: Stripe.Event
): Promise<{ duplicate: boolean; handled: boolean }> {
  const { data: existing } = await supabase
    .from("monetization_stripe_webhook_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (existing) return { duplicate: true, handled: true };

  try {
    let result: { duplicate: boolean; handled: boolean };

    switch (event.type) {
      case "checkout.session.completed":
        result = await handleCheckoutCompleted(supabase, event.data.object as Stripe.Checkout.Session);
        break;

      case "checkout.session.expired":
        await markOrderFailedByCheckoutSession(
          supabase,
          (event.data.object as Stripe.Checkout.Session).id,
          "checkout_expired"
        );
        result = { duplicate: false, handled: true };
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(supabase, event.data.object as Stripe.PaymentIntent);
        result = { duplicate: false, handled: true };
        break;

      case "charge.refunded":
        await handleChargeRefunded(supabase, event.data.object as Stripe.Charge);
        result = { duplicate: false, handled: true };
        break;

      case "charge.dispute.created":
        await handleDisputeCreated(supabase, event.data.object as Stripe.Dispute);
        result = { duplicate: false, handled: true };
        break;

      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleBackstageSubscriptionEvent(supabase, event.data.object as Stripe.Subscription);
        result = { duplicate: false, handled: true };
        break;

      case "invoice.paid":
        await handleInvoicePaid(supabase, stripe, event.data.object as Stripe.Invoice);
        result = { duplicate: false, handled: true };
        break;

      case "invoice.payment_failed":
        await handleInvoiceFailed(supabase, event.data.object as Stripe.Invoice);
        result = { duplicate: false, handled: true };
        break;

      default:
        await recordStripeWebhookEvent(supabase, {
          stripeEventId: event.id,
          eventType: event.type,
          status: "ignored",
        });
        return { duplicate: false, handled: false };
    }

    await recordStripeWebhookEvent(supabase, {
      stripeEventId: event.id,
      eventType: event.type,
      status: "processed",
      payload: { type: event.type, livemode: event.livemode },
    });

    return result;
  } catch (err) {
    await recordStripeWebhookEvent(supabase, {
      stripeEventId: event.id,
      eventType: event.type,
      status: "failed",
      errorMessage: String(err),
    });
    throw err;
  }
}

async function handleCheckoutCompleted(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session
): Promise<{ duplicate: boolean; handled: boolean }> {
  const backstage = await handleBackstageCheckoutSession(supabase, session);
  if (backstage) return { duplicate: false, handled: true };

  const marketplace = await handleMarketplaceCheckoutSession(supabase, session);
  if (marketplace) return { duplicate: false, handled: true };

  const localBiz = await handleLocalBusinessCampaignCheckout(supabase, session);
  if (localBiz) return { duplicate: false, handled: true };

  const { duplicate } = await fulfillPaidOrder(supabase, session);
  return { duplicate, handled: true };
}

async function handlePaymentFailed(supabase: SupabaseClient, paymentIntent: Stripe.PaymentIntent) {
  await markOrderFailedByPaymentIntent(
    supabase,
    paymentIntent.id,
    paymentIntent.last_payment_error?.message ?? "payment_failed"
  );

  await createAdminNotification(supabase, {
    category: "payment_fail",
    title: "Payment failed",
    message: paymentIntent.last_payment_error?.message ?? "Stripe payment intent failed",
    severity: "error",
    priority: "high",
    entityKey: paymentIntent.id,
  });
}

async function handleChargeRefunded(supabase: SupabaseClient, charge: Stripe.Charge) {
  const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  await recordRefund(supabase, {
    amountCents: charge.amount_refunded,
    stripePaymentIntentId: piId ?? null,
    stripeEventId: charge.id,
    reason: "Stripe charge refunded",
  });
}

async function handleDisputeCreated(supabase: SupabaseClient, dispute: Stripe.Dispute) {
  const piId =
    typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;
  await recordDispute(supabase, {
    amountCents: dispute.amount,
    stripePaymentIntentId: piId ?? null,
    stripeEventId: dispute.id,
    reason: dispute.reason ?? "Payment dispute opened",
  });
}

async function handleInvoicePaid(
  supabase: SupabaseClient,
  stripe: Stripe,
  invoice: Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }
) {
  const subRef = invoice.subscription;
  const subId = typeof subRef === "string" ? subRef : subRef?.id;
  if (subId) {
    const subscription = await stripe.subscriptions.retrieve(subId);
    await handleBackstageSubscriptionEvent(supabase, subscription);
  }
}

async function handleInvoiceFailed(supabase: SupabaseClient, invoice: Stripe.Invoice) {
  await createAdminNotification(supabase, {
    category: "payment_fail",
    title: "Subscription invoice failed",
    message: `Invoice ${invoice.id} payment failed`,
    severity: "error",
    priority: "high",
    entityKey: invoice.id,
  });
}
