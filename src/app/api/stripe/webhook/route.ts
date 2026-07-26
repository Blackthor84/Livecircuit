import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
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

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const backstage = await handleBackstageCheckoutSession(supabase, session);
    if (!backstage) {
      const marketplace = await handleMarketplaceCheckoutSession(supabase, session);
      if (!marketplace) {
        const localBiz = await handleLocalBusinessCampaignCheckout(supabase, session);
        if (!localBiz) {
          const { duplicate } = await fulfillPaidOrder(supabase, session);
          if (duplicate) {
            return NextResponse.json({ received: true, duplicate: true });
          }
        }
      }
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    await markOrderFailedByCheckoutSession(supabase, session.id, "checkout_expired");
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object;
    await markOrderFailedByPaymentIntent(
      supabase,
      paymentIntent.id,
      paymentIntent.last_payment_error?.message ?? "payment_failed"
    );
  }

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    await handleBackstageSubscriptionEvent(supabase, event.data.object);
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null;
    };
    const subRef = invoice.subscription;
    const subId = typeof subRef === "string" ? subRef : subRef?.id;
    if (subId) {
      const subscription = await stripe.subscriptions.retrieve(subId);
      await handleBackstageSubscriptionEvent(supabase, subscription);
    }
  }

  return NextResponse.json({ received: true });
}
