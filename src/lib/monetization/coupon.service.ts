import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CouponEffectType, CouponValidationResult } from "@/lib/monetization/extended-types";
import { getMonetizationSnapshot } from "@/lib/monetization/pricing-resolver.server";

export type CouponApplyContext = {
  code: string;
  purchaseType: "venue" | "ticket" | "agency" | "marketing" | "festival" | "replay" | "vip" | "general";
  subtotalCents: number;
  userId?: string;
  userType?: "artist" | "agency" | "sponsor" | "fan";
};

export async function validateAndApplyCoupon(
  supabase: SupabaseClient,
  ctx: CouponApplyContext
): Promise<CouponValidationResult> {
  const code = ctx.code.trim().toUpperCase();
  if (!code) return { valid: false, error: "Coupon code required" };

  const { data: coupon, error } = await supabase
    .from("monetization_coupons")
    .select("*")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !coupon) return { valid: false, error: "Invalid or expired coupon" };

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, error: "Coupon has expired" };
  }

  if (coupon.usage_limit != null && Number(coupon.usage_count) >= Number(coupon.usage_limit)) {
    return { valid: false, error: "Coupon usage limit reached" };
  }

  const appliesTo = coupon.applies_to as string;
  if (appliesTo !== "general" && appliesTo !== ctx.purchaseType) {
    return { valid: false, error: "Coupon not valid for this purchase type" };
  }

  const minPurchase = coupon.min_purchase_cents != null ? Number(coupon.min_purchase_cents) : null;
  if (minPurchase != null && ctx.subtotalCents < minPurchase) {
    return { valid: false, error: `Minimum purchase of $${(minPurchase / 100).toFixed(0)} required` };
  }

  const restrictions = (coupon.user_restrictions as Record<string, unknown>) ?? {};
  if (restrictions.userType && ctx.userType && restrictions.userType !== ctx.userType) {
    return { valid: false, error: "Coupon not available for your account type" };
  }

  if (ctx.userId && coupon.per_user_limit != null) {
    const { count } = await supabase
      .from("monetization_coupon_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id)
      .eq("user_id", ctx.userId);
    if (typeof count === "number" && count >= Number(coupon.per_user_limit)) {
      return { valid: false, error: "You have already used this coupon" };
    }
  }

  const effectType = (coupon.effect_type ?? coupon.discount_type) as CouponEffectType;
  let discountCents = 0;

  switch (effectType) {
    case "free_venue":
    case "free_ticket_fee":
    case "free_credits":
    case "free_trial":
      discountCents = ctx.subtotalCents;
      break;
    case "percent":
      discountCents = Math.round(ctx.subtotalCents * (Number(coupon.discount_value) / 100));
      break;
    case "fixed":
      discountCents = Math.round(Number(coupon.discount_value) * 100);
      break;
    case "bogo":
      discountCents = Math.round(ctx.subtotalCents / 2);
      break;
    default:
      discountCents = Math.round(ctx.subtotalCents * (Number(coupon.discount_value) / 100));
  }

  const maxDiscount = coupon.max_discount_cents != null ? Number(coupon.max_discount_cents) : null;
  if (maxDiscount != null) discountCents = Math.min(discountCents, maxDiscount);
  discountCents = Math.min(discountCents, ctx.subtotalCents);

  return {
    valid: true,
    discountCents,
    effectType,
    couponId: coupon.id as string,
    code,
  };
}

export async function recordCouponUsage(supabase: SupabaseClient, couponId: string) {
  const { data } = await supabase.from("monetization_coupons").select("usage_count").eq("id", couponId).single();
  if (!data) return;
  await supabase
    .from("monetization_coupons")
    .update({ usage_count: Number(data.usage_count ?? 0) + 1 })
    .eq("id", couponId);
}

/** @deprecated Use recordCouponRedemption from financial-ledger.service */
export { recordCouponRedemption as recordCouponUsageWithAudit } from "@/lib/monetization/financial-ledger.service";

export async function calculateCheckoutTotals(input: {
  subtotalCents: number;
  couponCode?: string;
  userId?: string;
  userType?: "artist" | "agency" | "sponsor" | "fan";
  purchaseType: CouponApplyContext["purchaseType"];
  supabase: SupabaseClient;
}) {
  const snapshot = await getMonetizationSnapshot();
  const platformFeeCents = Math.round(
    input.subtotalCents * (snapshot.tickets.platformFeePercent / 100) + snapshot.tickets.flatTicketFeeCents
  );

  let discountCents = 0;
  let couponResult: CouponValidationResult | null = null;

  if (input.couponCode) {
    couponResult = await validateAndApplyCoupon(input.supabase, {
      code: input.couponCode,
      purchaseType: input.purchaseType,
      subtotalCents: input.subtotalCents + platformFeeCents,
      userId: input.userId,
      userType: input.userType,
    });
    if (couponResult.valid) {
      if (couponResult.effectType === "free_ticket_fee") {
        discountCents = platformFeeCents;
      } else {
        discountCents = couponResult.discountCents;
      }
    }
  }

  const totalCents = Math.max(0, input.subtotalCents + platformFeeCents - discountCents);

  return {
    subtotalCents: input.subtotalCents,
    platformFeeCents,
    discountCents,
    totalCents,
    coupon: couponResult,
    platformFeePercent: snapshot.tickets.platformFeePercent,
  };
}
