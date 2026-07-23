import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import {
  activateBackstageSubscription,
  updateBackstageSubscriptionFromStripe,
} from "@/lib/services/backstage-pass.service";

function periodEndFromSubscription(sub: Stripe.Subscription) {
  const end = sub.items.data[0]?.current_period_end;
  return end ? new Date(end * 1000).toISOString() : null;
}

function mapStripeStatus(status: Stripe.Subscription.Status) {
  if (status === "active") return "active" as const;
  if (status === "trialing") return "trialing" as const;
  if (status === "past_due") return "past_due" as const;
  return "canceled" as const;
}

export async function handleBackstageCheckoutSession(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session
) {
  if (session.mode !== "subscription") return false;
  const planId = session.metadata?.backstage_plan_id;
  const userId = session.metadata?.user_id;
  if (!planId || !userId) return false;

  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;

  let currentPeriodEnd: string | null = null;
  if (subscriptionId) {
    if (session.subscription && typeof session.subscription !== "string") {
      currentPeriodEnd = periodEndFromSubscription(session.subscription);
    } else {
      const sub = await getStripe().subscriptions.retrieve(subscriptionId);
      currentPeriodEnd = periodEndFromSubscription(sub);
    }
  } else {
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    currentPeriodEnd = end.toISOString();
  }

  await activateBackstageSubscription(supabase, {
    userId,
    planId,
    stripeSubscriptionId: subscriptionId,
    stripeCustomerId:
      typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
    currentPeriodEnd,
  });

  return true;
}

export async function handleBackstageSubscriptionEvent(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription
) {
  const subId = subscription.id;
  await updateBackstageSubscriptionFromStripe(supabase, subId, {
    status: mapStripeStatus(subscription.status),
    currentPeriodEnd: periodEndFromSubscription(subscription),
  });
}
