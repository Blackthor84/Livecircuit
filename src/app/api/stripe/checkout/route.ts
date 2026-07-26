import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { clientRateLimitKey, rateLimit } from "@/lib/api/rate-limit";
import { getAppUrl } from "@/lib/config/env";
import {
  assertCheckoutAllowed,
  attachStripeSessionToOrder,
  CheckoutValidationError,
  createPendingOrder,
  resolveCheckout,
} from "@/lib/services/orders.service";
import {
  buildCheckoutCancelUrl,
  buildCheckoutSuccessUrl,
} from "@/lib/services/checkout-urls";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { checkoutBodySchema } from "@/lib/validations/checkout";

export async function POST(request: Request) {
  try {
    const limit = await rateLimit(clientRateLimitKey(request, "stripe-checkout"), 20, 60_000);
    if (!limit.ok) {
      return jsonError("Too many requests", 429, {
        "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
      });
    }

    const body = checkoutBodySchema.parse(await request.json());
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("Sign in required", 401);
    }

    const resolved = await resolveCheckout(supabase, body);
    await assertCheckoutAllowed(supabase, user.id, body, resolved);

    const quantity = body.type === "ticket" ? 1 : (body.quantity ?? 1);
    const orderId = await createPendingOrder(supabase, {
      userId: user.id,
      resolved,
      body,
    });

    const stripe = getStripe();
    const origin = getAppUrl();
    const successUrl = await buildCheckoutSuccessUrl(supabase, origin, body, resolved);
    const cancelUrl = buildCheckoutCancelUrl(origin, body);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          quantity,
          price_data: {
            currency: resolved.pricing.currency.toLowerCase(),
            unit_amount: resolved.pricing.unitAmountCents,
            product_data: {
              name: resolved.pricing.description,
              description: body.type,
            },
          },
        },
      ],
      metadata: {
        order_id: orderId,
        user_id: user.id,
        type: body.type,
        event_id: resolved.eventId ?? "",
        tour_stop_id: resolved.tourStopId ?? "",
        product_id: resolved.productId ?? "",
        tier: resolved.tier,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    await attachStripeSessionToOrder(supabase, orderId, session.id);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof CheckoutValidationError) {
      return jsonError(error.message, 422);
    }
    return handleRouteError(error);
  }
}
