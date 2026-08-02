import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { isSupabaseConfigured } from "@/lib/config/env";
import {
  CheckoutValidationError,
  assertCheckoutAllowed,
  resolveCheckout,
} from "@/lib/services/orders.service";
import { calculateCheckoutTotals } from "@/lib/monetization/coupon.service";
import { createClient } from "@/lib/supabase/server";
import {
  checkoutPreviewQuerySchema,
  previewQueryToBody,
} from "@/lib/validations/checkout";

export async function GET(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        description: "Demo checkout",
        unitAmountCents: 2500,
        currency: "USD",
        quantity: 1,
        totalCents: 2500,
        tier: "general",
        vipAvailable: false,
      });
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

    const totals = await calculateCheckoutTotals({
      subtotalCents,
      couponCode: body.couponCode,
      userId: user?.id,
      purchaseType: body.type === "ticket" ? "ticket" : "general",
      supabase,
    });

    return NextResponse.json({
      description: resolved.pricing.description,
      unitAmountCents: resolved.pricing.unitAmountCents,
      currency: resolved.pricing.currency,
      quantity,
      subtotalCents,
      platformFeeCents: totals.platformFeeCents,
      discountCents: totals.discountCents,
      totalCents: totals.totalCents,
      platformFeePercent: totals.platformFeePercent,
      couponApplied: totals.coupon?.valid ? totals.coupon.code : null,
      couponError: totals.coupon && !totals.coupon.valid ? totals.coupon.error : null,
      tier: resolved.tier,
      vipAvailable,
      availabilityError,
      eventId: resolved.eventId,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
