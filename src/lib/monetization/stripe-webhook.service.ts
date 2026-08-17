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
  recordStripeWebhookEvent,
} from "@/lib/monetization/financial-ledger.service";
import { processRefundByPaymentIntent } from "@/lib/services/refund.service";
import {
  handleDestinationChargeDisputeClosed,
  handleDestinationChargeDisputeCreated,
} from "@/lib/services/dispute.service";
import {
  handleStripePayoutEvent,
} from "@/lib/services/artist-payout.service";
import {
  reconcileOrderStripeFeesFromCharge,
  resolveOrderIdForStripeCharge,
} from "@/lib/monetization/stripe-fee-reconciliation.service";
import {
  resolveArtistIdForStripeAccount,
  syncArtistConnectFromStripeAccount,
} from "@/lib/stripe/connect";
import { createAdminNotification } from "@/lib/monetization/admin-notifications.service";

async function resolveOrderIdForWebhookEvent(
  supabase: SupabaseClient,
  stripe: Stripe,
  event: Stripe.Event,
): Promise<string | null> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.order_id) return session.metadata.order_id;
      const { data } = await supabase
        .from("orders")
        .select("id")
        .eq("stripe_checkout_session_id", session.id)
        .maybeSingle();
      return (data?.id as string | undefined) ?? null;
    }
    case "charge.succeeded":
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      return resolveOrderIdForStripeCharge(supabase, stripe, charge);
    }
    default:
      return null;
  }
}

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

      case "charge.succeeded":
        await handleChargeSucceeded(supabase, stripe, event.data.object as Stripe.Charge);
        result = { duplicate: false, handled: true };
        break;

      case "charge.dispute.created":
        await handleDisputeCreated(supabase, stripe, event.data.object as Stripe.Dispute, event.id);
        result = { duplicate: false, handled: true };
        break;

      case "charge.dispute.closed":
        await handleDisputeClosed(supabase, stripe, event.data.object as Stripe.Dispute);
        result = { duplicate: false, handled: true };
        break;

      case "payout.created":
      case "payout.paid":
      case "payout.failed":
      case "payout.canceled":
        await handlePayoutEvent(supabase, event);
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

      case "account.updated":
        result = await handleAccountUpdated(supabase, event.data.object as Stripe.Account);
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
      orderId: await resolveOrderIdForWebhookEvent(supabase, stripe, event),
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
  if (!piId) {
    console.warn("[stripe-webhook] charge.refunded without payment_intent", charge.id);
    return;
  }

  const latestRefund = charge.refunds?.data?.[0];
  const result = await processRefundByPaymentIntent(supabase, {
    stripePaymentIntentId: piId,
    amountCents: charge.amount_refunded,
    stripeEventId: charge.id,
    stripeRefundId: latestRefund?.id ?? charge.id,
    reason: "Stripe charge refunded",
  });

  if (!result.ok) {
    throw new Error(result.error);
  }
}

async function handleChargeSucceeded(
  supabase: SupabaseClient,
  stripe: Stripe,
  charge: Stripe.Charge,
) {
  const orderId = charge.metadata?.order_id ?? null;
  await reconcileOrderStripeFeesFromCharge(supabase, charge, orderId, stripe);
}

async function handleDisputeCreated(
  supabase: SupabaseClient,
  stripe: Stripe,
  dispute: Stripe.Dispute,
  stripeEventId: string,
) {
  const piId =
    typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;

  await recordDispute(supabase, {
    amountCents: dispute.amount,
    stripePaymentIntentId: piId ?? null,
    stripeEventId: dispute.id,
    reason: dispute.reason ?? "Payment dispute opened",
  });

  await handleDestinationChargeDisputeCreated(supabase, stripe, dispute, stripeEventId);
}

async function handleDisputeClosed(
  supabase: SupabaseClient,
  stripe: Stripe,
  dispute: Stripe.Dispute,
) {
  await handleDestinationChargeDisputeClosed(supabase, stripe, dispute);
}

async function handlePayoutEvent(supabase: SupabaseClient, event: Stripe.Event) {
  const payout = event.data.object as Stripe.Payout;
  const connectedAccountId = event.account ?? null;
  await handleStripePayoutEvent(supabase, payout, connectedAccountId);
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

async function handleAccountUpdated(
  supabase: SupabaseClient,
  account: Stripe.Account,
): Promise<{ duplicate: boolean; handled: boolean }> {
  const artistId = await resolveArtistIdForStripeAccount(supabase, account);
  if (!artistId) {
    console.warn("[stripe-webhook] account.updated without linked artist", account.id);
    return { duplicate: false, handled: false };
  }

  await syncArtistConnectFromStripeAccount(supabase, artistId, account);
  return { duplicate: false, handled: true };
}
