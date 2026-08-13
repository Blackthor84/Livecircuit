import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { isSupabaseConfigured } from "@/lib/config/env";
import {
  CheckoutValidationError,
  assertCheckoutAllowed,
  resolveCheckout,
} from "@/lib/services/orders.service";
import { calculateCheckoutTotals, validateAndApplyCoupon } from "@/lib/monetization/coupon.service";
import { getMonetizationSnapshot } from "@/lib/monetization/pricing-resolver.server";
import {
  calculateArtistTicketRevenueSplit,
  isPaidArtistTicketCheckout,
} from "@/lib/monetization/ticket-revenue-split";
import { createClient } from "@/lib/supabase/server";
import {
  checkoutPreviewQuerySchema,
  previewQueryToBody,
} from "@/lib/validations/checkout";

export async function GET(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return jsonError("Checkout is not available", 503);
    }

    const { searchParams } = new URL(request.url);
    const parsed = checkoutPreviewQuerySchema.safeParse({
      type: searchParams.get("type") ?? "ticket",
      event: searchParams.get("event") ?? undefined,
      tourStop: searchParams.get("tourStop") ?? undefined,
      product: searchParams.get("product") ?? undefined,
      artist: searchParams.get("artist") ?? undefined,
      artistId: searchParams.get("artistId") ?? undefined,
      tier: searchParams.get("tier") ?? undefined,
      festivalTier: searchParams.get("festivalTier") ?? undefined,
      tipAmountCents: searchParams.get("tipAmountCents") ?? undefined,
      couponCode: searchParams.get("coupon") ?? searchParams.get("couponCode") ?? undefined,
      quantity: searchParams.get("quantity") ?? undefined,
    });

    if (!parsed.success) {
      return jsonError("Invalid checkout parameters", 422);
    }

    const body = previewQueryToBody(parsed.data);
    const supabase = await createClient();
    const resolved = await resolveCheckout(supabase, body);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let availabilityError: string | null = null;
    if (user) {
      try {
        await assertCheckoutAllowed(supabase, user.id, body, resolved);
      } catch (e) {
        if (e instanceof CheckoutValidationError) {
          availabilityError = e.message;
        } else {
          throw e;
        }
      }
    }

    let vipAvailable = false;
    if (body.type === "ticket" && (body.eventId || body.tourStopId)) {
      if (body.eventId) {
        const { data: event } = await supabase
          .from("events")
          .select("tour_stops(vip_price_cents)")
          .eq("id", body.eventId)
          .maybeSingle();
        const raw = event?.tour_stops as { vip_price_cents: number | null } | { vip_price_cents: number | null }[];
        const stop = Array.isArray(raw) ? raw[0] : raw;
        vipAvailable = Boolean(stop?.vip_price_cents && stop.vip_price_cents > 0);
      } else if (body.tourStopId) {
        const { data: stop } = await supabase
          .from("tour_stops")
          .select("vip_price_cents")
          .eq("id", body.tourStopId)
          .maybeSingle();
        vipAvailable = Boolean(stop?.vip_price_cents && stop.vip_price_cents > 0);
      }
    }

    const quantity = body.type === "ticket" ? 1 : (body.quantity ?? 1);
    const subtotalCents = resolved.pricing.unitAmountCents * quantity;
    const paidArtistTicket = isPaidArtistTicketCheckout({
      orderType: body.type,
      unitAmountCents: resolved.pricing.unitAmountCents,
      artistId: resolved.artistId,
    });

    let platformFeeCents = 0;
    let discountCents = 0;
    let totalCents = subtotalCents;
    let platformFeePercent = 10;
    let artistEarningsCents = 0;
    let couponApplied: string | null = null;
    let couponError: string | null = null;

    if (paidArtistTicket) {
      const snapshot = await getMonetizationSnapshot();
      platformFeePercent = snapshot.tickets.platformFeePercent;
      if (body.couponCode) {
        const couponResult = await validateAndApplyCoupon(supabase, {
          code: body.couponCode,
          purchaseType: body.tier === "vip" ? "vip" : "ticket",
          subtotalCents,
          userId: user?.id,
        });
        if (couponResult.valid) {
          discountCents = couponResult.discountCents;
          couponApplied = couponResult.code ?? null;
        } else {
          couponError = couponResult.error ?? "Invalid coupon";
        }
      }
      const split = calculateArtistTicketRevenueSplit({
        ticketSubtotalCents: subtotalCents,
        discountCents,
        platformFeePercent,
      });
      platformFeeCents = split.platformFeeCents;
      artistEarningsCents = split.artistEarningsCents;
      totalCents = split.grossCents;
    } else {
      const totals = await calculateCheckoutTotals({
        subtotalCents,
        couponCode: body.couponCode,
        userId: user?.id,
        purchaseType: body.type === "ticket" ? "ticket" : "general",
        supabase,
      });
      platformFeeCents = totals.platformFeeCents;
      discountCents = totals.discountCents;
      totalCents = totals.totalCents;
      platformFeePercent = totals.platformFeePercent;
      couponApplied = totals.coupon?.valid ? totals.coupon.code : null;
      couponError = totals.coupon && !totals.coupon.valid ? totals.coupon.error : null;
    }

    return NextResponse.json({
      description: resolved.pricing.description,
      unitAmountCents: resolved.pricing.unitAmountCents,
      currency: resolved.pricing.currency,
      quantity,
      subtotalCents,
      platformFeeCents,
      artistEarningsCents,
      discountCents,
      totalCents,
      platformFeePercent,
      couponApplied,
      couponError,
      tier: resolved.tier,
      vipAvailable,
      availabilityError,
      eventId: resolved.eventId,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
