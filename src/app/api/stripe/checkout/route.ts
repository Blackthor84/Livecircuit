import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { clientRateLimitKey, rateLimit } from "@/lib/api/rate-limit";
import { getAppUrl } from "@/lib/config/env";
import { calculateCheckoutTotals, validateAndApplyCoupon } from "@/lib/monetization/coupon.service";
import { getMonetizationSnapshot } from "@/lib/monetization/pricing-resolver.server";
import {
  calculateArtistTicketRevenueSplit,
  isPaidArtistTicketCheckout,
} from "@/lib/monetization/ticket-revenue-split";
import {
  assertArtistConnectReadyForPaidTickets,
  ArtistConnectNotReadyError,
} from "@/lib/services/artist-balance.service";
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
import { getSupabaseAdmin } from "@/lib/supabase/admin";
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
    const admin = getSupabaseAdmin();
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
    const paidArtistTicket = isPaidArtistTicketCheckout({
      orderType: body.type,
      unitAmountCents: resolved.pricing.unitAmountCents,
      artistId: resolved.artistId,
    });

    let checkoutTotals: {
      subtotalCents: number;
      platformFeeCents: number;
      discountCents: number;
      totalCents: number;
      couponId?: string | null;
      couponCode?: string | null;
      grossCents?: number | null;
      artistEarningsCents?: number | null;
      lockedPlatformFeePercent?: number | null;
      ticketRevenueSplit?: boolean;
    };

    let stripeAccountId: string | null = null;

    if (paidArtistTicket) {
      if (!resolved.artistId) {
        throw new CheckoutValidationError("Artist payment setup is incomplete.");
      }

      const connect = await assertArtistConnectReadyForPaidTickets(admin, resolved.artistId);
      stripeAccountId = connect.stripeAccountId;

      const snapshot = await getMonetizationSnapshot();
      const lockedPlatformFeePercent = snapshot.tickets.platformFeePercent;

      let discountCents = 0;
      let couponId: string | null = null;
      let couponCode: string | null = null;

      if (body.couponCode) {
        const couponResult = await validateAndApplyCoupon(supabase, {
          code: body.couponCode,
          purchaseType: purchaseType(body),
          subtotalCents,
          userId: user.id,
        });
        if (!couponResult.valid) {
          throw new CheckoutValidationError(couponResult.error ?? "Invalid coupon");
        }
        discountCents = couponResult.discountCents;
        couponId = couponResult.couponId ?? null;
        couponCode = couponResult.code ?? null;
      }

      const split = calculateArtistTicketRevenueSplit({
        ticketSubtotalCents: subtotalCents,
        discountCents,
        platformFeePercent: lockedPlatformFeePercent,
      });

      checkoutTotals = {
        subtotalCents,
        platformFeeCents: split.platformFeeCents,
        discountCents,
        totalCents: split.grossCents,
        grossCents: split.grossCents,
        artistEarningsCents: split.artistEarningsCents,
        lockedPlatformFeePercent: split.platformFeePercent,
        ticketRevenueSplit: true,
        couponId,
        couponCode,
      };
    } else {
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

      checkoutTotals = {
        subtotalCents: totals.subtotalCents,
        platformFeeCents: totals.platformFeeCents,
        discountCents: totals.discountCents,
        totalCents: totals.totalCents,
        couponId: totals.coupon?.valid ? totals.coupon.couponId : null,
        couponCode: totals.coupon?.valid ? totals.coupon.code : null,
        ticketRevenueSplit: false,
      };
    }

    const orderId = await createPendingOrder(supabase, {
      userId: user.id,
      resolved,
      body,
      checkoutTotals,
    });

    const stripe = getStripe();
    const origin = getAppUrl();
    const successUrl = await buildCheckoutSuccessUrl(supabase, origin, body, resolved);
    const cancelUrl = buildCheckoutCancelUrl(origin, body);

    const descriptionParts: string[] = [body.type];
    if (checkoutTotals.platformFeeCents > 0 && !paidArtistTicket) {
      descriptionParts.push("incl. platform fee");
    }
    if (checkoutTotals.couponCode) descriptionParts.push(`coupon ${checkoutTotals.couponCode}`);

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: resolved.pricing.currency.toLowerCase(),
            unit_amount: checkoutTotals.totalCents,
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
        coupon_id: checkoutTotals.couponId ?? "",
        coupon_code: checkoutTotals.couponCode ?? "",
        platform_fee_cents: String(checkoutTotals.platformFeeCents),
        discount_cents: String(checkoutTotals.discountCents),
        subtotal_cents: String(checkoutTotals.subtotalCents),
        gross_cents: checkoutTotals.grossCents != null ? String(checkoutTotals.grossCents) : "",
        artist_earnings_cents:
          checkoutTotals.artistEarningsCents != null
            ? String(checkoutTotals.artistEarningsCents)
            : "",
        ticket_revenue_split: paidArtistTicket ? "true" : "false",
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    };

    if (paidArtistTicket && stripeAccountId) {
      sessionParams.payment_intent_data = {
        application_fee_amount: checkoutTotals.platformFeeCents,
        transfer_data: {
          destination: stripeAccountId,
        },
        metadata: {
          order_id: orderId,
          artist_id: resolved.artistId ?? "",
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    await attachStripeSessionToOrder(supabase, orderId, session.id);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof CheckoutValidationError) {
      return jsonError(error.message, 422);
    }
    if (error instanceof ArtistConnectNotReadyError) {
      return jsonError(error.message, 422);
    }
    return handleRouteError(error);
  }
}
