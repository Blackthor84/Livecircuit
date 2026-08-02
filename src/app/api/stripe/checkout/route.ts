import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { clientRateLimitKey, rateLimit } from "@/lib/api/rate-limit";
import { getAppUrl } from "@/lib/config/env";
import { calculateCheckoutTotals } from "@/lib/monetization/coupon.service";
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
import { checkoutBodySchema, type CheckoutBody } from "@/lib/validations/checkout";

function purchaseType(body: CheckoutBody) {
  if (body.type === "ticket") return body.tier === "vip" ? ("vip" as const) : ("ticket" as const);
  if (body.type === "festival") return "festival" as const;
  if (body.type === "digital") return "replay" as const;
  if (body.type === "tour_pass") return "festival" as const;
  return "general" as const;
}

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
    const subtotalCents = resolved.pricing.unitAmountCents * quantity;

    const totals = await calculateCheckoutTotals({
      subtotalCents,
      couponCode: body.couponCode,
      userId: user.id,
      purchaseType: purchaseType(body),
      supabase,
    });

    if (body.couponCode && totals.coupon && !totals.coupon.valid) {
      throw new CheckoutValidationError(totals.coupon.error ?? "Invalid coupon");
    }

    const orderId = await createPendingOrder(supabase, {
      userId: user.id,
      resolved,
      body,
      checkoutTotals: {
        subtotalCents: totals.subtotalCents,
        platformFeeCents: totals.platformFeeCents,
        discountCents: totals.discountCents,
        totalCents: totals.totalCents,
        couponId: totals.coupon?.valid ? totals.coupon.couponId : null,
        couponCode: totals.coupon?.valid ? totals.coupon.code : null,
      },
    });

    const stripe = getStripe();
    const origin = getAppUrl();
    const successUrl = await buildCheckoutSuccessUrl(supabase, origin, body, resolved);
    const cancelUrl = buildCheckoutCancelUrl(origin, body);

    const descriptionParts: string[] = [body.type];
    if (totals.platformFeeCents > 0) descriptionParts.push("incl. platform fee");
    if (totals.coupon?.valid) descriptionParts.push(`coupon ${totals.coupon.code}`);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: resolved.pricing.currency.toLowerCase(),
            unit_amount: totals.totalCents,
            product_data: {
              name: resolved.pricing.description,
              description: descriptionParts.join(" · "),
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
        coupon_id: totals.coupon?.valid ? totals.coupon.couponId ?? "" : "",
        coupon_code: totals.coupon?.valid ? totals.coupon.code ?? "" : "",
        platform_fee_cents: String(totals.platformFeeCents),
        discount_cents: String(totals.discountCents),
        subtotal_cents: String(totals.subtotalCents),
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
