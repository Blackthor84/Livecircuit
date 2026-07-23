import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { clientRateLimitKey, rateLimit } from "@/lib/api/rate-limit";
import { getAppUrl, isSupabaseConfigured } from "@/lib/config/env";
import { activateBackstageSubscription } from "@/lib/services/backstage-pass.service";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

export async function POST(request: Request) {
  try {
    const limit = await rateLimit(clientRateLimitKey(request, "backstage-subscribe"), 10, 60_000);
    if (!limit.ok) {
      return jsonError("Too many requests", 429, {
        "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
      });
    }

    if (!isSupabaseConfigured()) {
      return jsonError("Not configured", 503);
    }

    const body = (await request.json()) as { planId?: string };
    const planId = body.planId?.trim();
    if (!planId) return jsonError("Missing planId", 400);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Sign in required", 401);

    const { data: plan } = await supabase
      .from("backstage_pass_plans")
      .select("id, name, price_cents_monthly, artists(slug)")
      .eq("id", planId)
      .eq("is_active", true)
      .maybeSingle();

    if (!plan) return jsonError("Plan not found", 404);

    const artistRaw = plan.artists as { slug: string } | { slug: string }[];
    const artistSlug = Array.isArray(artistRaw) ? artistRaw[0]?.slug : artistRaw?.slug;

    if (plan.price_cents_monthly === 0) {
      const end = new Date();
      end.setMonth(end.getMonth() + 1);
      await activateBackstageSubscription(supabase, {
        userId: user.id,
        planId,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        currentPeriodEnd: end.toISOString(),
      });
      return NextResponse.json({
        url: `${getAppUrl()}/artists/${artistSlug}/backstage?subscribed=1`,
      });
    }

    const stripe = getStripe();
    const origin = getAppUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: plan.price_cents_monthly as number,
            recurring: { interval: "month" },
            product_data: {
              name: plan.name as string,
              description: "Backstage Pass — monthly membership",
            },
          },
        },
      ],
      metadata: {
        user_id: user.id,
        backstage_plan_id: planId,
        type: "backstage",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          backstage_plan_id: planId,
        },
      },
      success_url: `${origin}/artists/${artistSlug}/backstage?subscribed=1`,
      cancel_url: `${origin}/artists/${artistSlug}/backstage?canceled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return handleRouteError(error);
  }
}
