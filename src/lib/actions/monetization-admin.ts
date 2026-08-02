"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { MONETIZATION_CACHE_TAG } from "@/lib/monetization/pricing-resolver.server";
import { createClient } from "@/lib/supabase/server";

export type MonetizationActionResult = { ok: true; id?: string } | { ok: false; error: string };

const MONETIZATION_PATHS = [
  "/admin/monetization",
  "/admin/monetization/venue",
  "/admin/monetization/ticketing",
  "/admin/monetization/agency",
  "/admin/monetization/promotions",
  "/admin/monetization/credits",
  "/admin/monetization/coupons",
  "/admin/monetization/taxes",
  "/admin/monetization/payouts",
  "/admin/monetization/future",
  "/admin/monetization/history",
  "/",
  "/creator-promise",
  "/agency/pricing",
];

function revalidateAll() {
  revalidateTag(MONETIZATION_CACHE_TAG, "max");
  for (const p of MONETIZATION_PATHS) revalidatePath(p);
}

async function logHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: { category: string; entityKey: string; fieldName: string; oldValue: unknown; newValue: unknown; reason?: string; userId?: string }
) {
  await supabase.from("monetization_pricing_history").insert({
    category: input.category,
    entity_key: input.entityKey,
    field_name: input.fieldName,
    old_value: input.oldValue != null ? JSON.parse(JSON.stringify(input.oldValue)) : null,
    new_value: input.newValue != null ? JSON.parse(JSON.stringify(input.newValue)) : null,
    reason: input.reason ?? null,
    changed_by: input.userId ?? null,
  });
}

export async function updateVenuePricingAction(input: unknown): Promise<MonetizationActionResult> {
  await requireAdmin("/admin/monetization/venue");
  const parsed = z.object({
    tierId: z.string(),
    bookingFeeDollars: z.number().min(0),
    minBookingFeeDollars: z.number().min(0).optional(),
    maxBookingFeeDollars: z.number().min(0).optional(),
    isActive: z.boolean(),
    visibility: z.string(),
    earlyBirdDiscountPercent: z.number().min(0).max(100).optional(),
    bulkBookingDiscountPercent: z.number().min(0).max(100).optional(),
    agencyDiscountPercent: z.number().min(0).max(100).optional(),
    weekendMultiplier: z.number().min(0).optional(),
    peakHourMultiplier: z.number().min(0).optional(),
    holidayMultiplier: z.number().min(0).optional(),
    promoBookingFeeDollars: z.number().min(0).optional(),
    promoStartsAt: z.string().optional(),
    promoEndsAt: z.string().optional(),
    scheduledFeeDollars: z.number().min(0).optional(),
    scheduledEffectiveAt: z.string().optional(),
    requiresApproval: z.boolean().optional(),
    reason: z.string().optional(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid venue pricing" };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: existing } = await supabase.from("monetization_venue_tiers").select("booking_fee_cents").eq("tier_id", parsed.data.tierId).maybeSingle();

  const patch = {
    booking_fee_cents: Math.round(parsed.data.bookingFeeDollars * 100),
    min_booking_fee_cents: parsed.data.minBookingFeeDollars != null ? Math.round(parsed.data.minBookingFeeDollars * 100) : null,
    max_booking_fee_cents: parsed.data.maxBookingFeeDollars != null ? Math.round(parsed.data.maxBookingFeeDollars * 100) : null,
    is_active: parsed.data.isActive,
    visibility: parsed.data.visibility,
    early_bird_discount_percent: parsed.data.earlyBirdDiscountPercent ?? 0,
    bulk_booking_discount_percent: parsed.data.bulkBookingDiscountPercent ?? 0,
    agency_discount_percent: parsed.data.agencyDiscountPercent ?? 0,
    weekend_multiplier: parsed.data.weekendMultiplier ?? 1,
    peak_hour_multiplier: parsed.data.peakHourMultiplier ?? 1,
    holiday_multiplier: parsed.data.holidayMultiplier ?? 1,
    promo_booking_fee_cents: parsed.data.promoBookingFeeDollars != null ? Math.round(parsed.data.promoBookingFeeDollars * 100) : null,
    promo_starts_at: parsed.data.promoStartsAt || null,
    promo_ends_at: parsed.data.promoEndsAt || null,
    scheduled_fee_cents: parsed.data.scheduledFeeDollars != null ? Math.round(parsed.data.scheduledFeeDollars * 100) : null,
    scheduled_effective_at: parsed.data.scheduledEffectiveAt || null,
    requires_approval: parsed.data.requiresApproval ?? false,
    updated_at: new Date().toISOString(),
    updated_by: userData.user?.id ?? null,
  };

  const { error } = await supabase.from("monetization_venue_tiers").update(patch).eq("tier_id", parsed.data.tierId);
  if (error) return { ok: false, error: error.message };

  await logHistory(supabase, {
    category: "venue", entityKey: parsed.data.tierId, fieldName: "booking_fee_cents",
    oldValue: existing?.booking_fee_cents, newValue: patch.booking_fee_cents,
    reason: parsed.data.reason, userId: userData.user?.id,
  });

  revalidateAll();
  return { ok: true };
}

export async function updateTicketPricingAction(input: unknown): Promise<MonetizationActionResult> {
  await requireAdmin("/admin/monetization/ticketing");
  const parsed = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid ticket config" };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const d = parsed.data as Record<string, unknown>;

  const patch: Record<string, unknown> = {
    platform_fee_percent: Number(d.platformFeePercent ?? 10),
    flat_ticket_fee_cents: Math.round(Number(d.flatTicketFeeDollars ?? 0) * 100),
    min_platform_fee_cents: Math.round(Number(d.minPlatformFeeDollars ?? 0) * 100),
    max_platform_fee_cents: d.maxPlatformFeeDollars != null ? Math.round(Number(d.maxPlatformFeeDollars) * 100) : null,
    vip_fee_percent: Number(d.vipFeePercent ?? 0),
    replay_fee_percent: Number(d.replayFeePercent ?? 0),
    festival_pass_fee_percent: Number(d.festivalPassFeePercent ?? 0),
    service_fee_percent: Number(d.serviceFeePercent ?? 0),
    refund_fee_cents: Math.round(Number(d.refundFeeDollars ?? 0) * 100),
    chargeback_fee_cents: Math.round(Number(d.chargebackFeeDollars ?? 0) * 100),
    late_cancellation_fee_cents: Math.round(Number(d.lateCancellationFeeDollars ?? 0) * 100),
    payment_processing_rate_percent: Number(d.paymentProcessingRatePercent ?? 2.9),
    payment_processing_fixed_cents: Number(d.paymentProcessingFixedCents ?? 30),
    stripe_connect_enabled: Boolean(d.stripeConnectEnabled),
    visibility: String(d.visibility ?? "enabled"),
    updated_at: new Date().toISOString(),
    updated_by: userData.user?.id ?? null,
  };

  const { error } = await supabase.from("monetization_ticket_config").update(patch).eq("id", "default");
  if (error) return { ok: false, error: error.message };

  await logHistory(supabase, { category: "ticket", entityKey: "default", fieldName: "config", oldValue: null, newValue: patch, reason: String(d.reason ?? ""), userId: userData.user?.id });
  revalidateAll();
  return { ok: true };
}

export async function updateAgencyPlanPricingAction(input: unknown): Promise<MonetizationActionResult> {
  await requireAdmin("/admin/monetization/agency");
  const parsed = z.object({
    planId: z.string(),
    priceDollars: z.number().min(0),
    annualPriceDollars: z.number().min(0).optional(),
    monthlyDiscountPercent: z.number().min(0).max(100).optional(),
    annualDiscountPercent: z.number().min(0).max(100).optional(),
    promoPriceDollars: z.number().min(0).optional(),
    trialDays: z.number().int().min(0).optional(),
    artistLimit: z.number().int().min(0).nullable().optional(),
    staffLimit: z.number().int().min(0).nullable().optional(),
    promotionalCreditsDollars: z.number().min(0).optional(),
    supportLevel: z.string().optional(),
    visibility: z.string().optional(),
    isPopular: z.boolean().optional(),
    scheduledPriceDollars: z.number().min(0).optional(),
    scheduledEffectiveAt: z.string().optional(),
    reason: z.string().optional(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid agency plan" };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const patch = {
    price_cents: Math.round(parsed.data.priceDollars * 100),
    annual_price_cents: parsed.data.annualPriceDollars != null ? Math.round(parsed.data.annualPriceDollars * 100) : null,
    monthly_discount_percent: parsed.data.monthlyDiscountPercent ?? 0,
    annual_discount_percent: parsed.data.annualDiscountPercent ?? 0,
    promo_price_cents: parsed.data.promoPriceDollars != null ? Math.round(parsed.data.promoPriceDollars * 100) : null,
    trial_days: parsed.data.trialDays ?? 0,
    artist_limit: parsed.data.artistLimit ?? null,
    staff_limit: parsed.data.staffLimit ?? null,
    promotional_credits_cents: parsed.data.promotionalCreditsDollars != null ? Math.round(parsed.data.promotionalCreditsDollars * 100) : undefined,
    support_level: parsed.data.supportLevel,
    visibility: parsed.data.visibility,
    is_popular: parsed.data.isPopular,
    scheduled_price_cents: parsed.data.scheduledPriceDollars != null ? Math.round(parsed.data.scheduledPriceDollars * 100) : null,
    scheduled_effective_at: parsed.data.scheduledEffectiveAt || null,
    updated_at: new Date().toISOString(),
    updated_by: userData.user?.id ?? null,
  };

  const { error } = await supabase.from("monetization_agency_plans").update(patch).eq("plan_id", parsed.data.planId);
  if (error) return { ok: false, error: error.message };

  await logHistory(supabase, { category: "agency", entityKey: parsed.data.planId, fieldName: "price_cents", oldValue: null, newValue: patch.price_cents, reason: parsed.data.reason, userId: userData.user?.id });
  revalidateAll();
  return { ok: true };
}

export async function updatePromotionProductAction(input: unknown): Promise<MonetizationActionResult> {
  await requireAdmin("/admin/monetization/promotions");
  const parsed = z.object({ slug: z.string(), priceDollars: z.number().min(0), isActive: z.boolean(), visibility: z.string() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid promotion" };

  const supabase = await createClient();
  const { error } = await supabase.from("monetization_promotion_products").update({
    price_cents: Math.round(parsed.data.priceDollars * 100),
    is_active: parsed.data.isActive,
    visibility: parsed.data.visibility,
    updated_at: new Date().toISOString(),
  }).eq("slug", parsed.data.slug);
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function updateMarketingCreditsAction(input: unknown): Promise<MonetizationActionResult> {
  await requireAdmin("/admin/monetization/credits");
  const parsed = z.object({
    planId: z.string(),
    includedCreditsDollars: z.number().min(0),
    expirationDays: z.number().int().min(0).nullable().optional(),
    rolloverEnabled: z.boolean(),
    additionalCreditPriceDollars: z.number().min(0).optional(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid credits config" };

  const supabase = await createClient();
  const { error } = await supabase.from("monetization_marketing_credits").upsert({
    plan_id: parsed.data.planId,
    included_credits_cents: Math.round(parsed.data.includedCreditsDollars * 100),
    expiration_days: parsed.data.expirationDays ?? null,
    rollover_enabled: parsed.data.rolloverEnabled,
    additional_credit_price_cents: parsed.data.additionalCreditPriceDollars != null ? Math.round(parsed.data.additionalCreditPriceDollars * 100) : null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function createCouponAction(input: unknown): Promise<MonetizationActionResult> {
  await requireAdmin("/admin/monetization/coupons");
  const parsed = z.object({
    code: z.string().min(2),
    name: z.string().optional(),
    discountType: z.enum(["percent", "fixed"]),
    discountValue: z.number().positive(),
    appliesTo: z.string(),
    usageLimit: z.number().int().positive().optional(),
    expiresAt: z.string().optional(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid coupon" };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("monetization_coupons").insert({
    code: parsed.data.code.toUpperCase(),
    name: parsed.data.name ?? null,
    discount_type: parsed.data.discountType,
    discount_value: parsed.data.discountValue,
    applies_to: parsed.data.appliesTo,
    usage_limit: parsed.data.usageLimit ?? null,
    expires_at: parsed.data.expiresAt || null,
    created_by: userData.user?.id ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true, id: data.id as string };
}

export async function updateTaxConfigAction(input: unknown): Promise<MonetizationActionResult> {
  await requireAdmin("/admin/monetization/taxes");
  const parsed = z.object({
    salesTaxPercent: z.number().min(0),
    vatPercent: z.number().min(0),
    gstPercent: z.number().min(0),
    processingFeeDisplay: z.string(),
    platformFeeDisplay: z.string(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid tax config" };

  const supabase = await createClient();
  const { error } = await supabase.from("monetization_tax_config").update({ ...parsed.data, updated_at: new Date().toISOString() }).eq("id", "default");
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function updatePayoutConfigAction(input: unknown): Promise<MonetizationActionResult> {
  await requireAdmin("/admin/monetization/payouts");
  const parsed = z.object({
    payoutDelayDays: z.number().int().min(0),
    minPayoutDollars: z.number().min(0),
    maxPayoutDollars: z.number().min(0).nullable().optional(),
    reservePercent: z.number().min(0).max(100),
    manualReviewThresholdDollars: z.number().min(0),
    stripeConnectReady: z.boolean(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid payout config" };

  const supabase = await createClient();
  const { error } = await supabase.from("monetization_payout_config").update({
    payout_delay_days: parsed.data.payoutDelayDays,
    min_payout_cents: Math.round(parsed.data.minPayoutDollars * 100),
    max_payout_cents: parsed.data.maxPayoutDollars != null ? Math.round(parsed.data.maxPayoutDollars * 100) : null,
    reserve_percent: parsed.data.reservePercent,
    manual_review_threshold_cents: Math.round(parsed.data.manualReviewThresholdDollars * 100),
    stripe_connect_ready: parsed.data.stripeConnectReady,
    updated_at: new Date().toISOString(),
  }).eq("id", "default");
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function schedulePricingAction(input: unknown): Promise<MonetizationActionResult> {
  await requireAdmin("/admin/monetization/future");
  const parsed = z.object({
    category: z.string(),
    entityKey: z.string(),
    changes: z.record(z.string(), z.unknown()),
    effectiveAt: z.string(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid schedule" };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("monetization_scheduled_pricing").insert({
    category: parsed.data.category,
    entity_key: parsed.data.entityKey,
    changes: parsed.data.changes,
    effective_at: parsed.data.effectiveAt,
    created_by: userData.user?.id ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/monetization/future");
  return { ok: true, id: data.id as string };
}

export async function rollbackPricingHistoryAction(input: unknown): Promise<MonetizationActionResult> {
  await requireAdmin("/admin/monetization/history");
  const parsed = z.object({ historyId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid history id" };

  const supabase = await createClient();
  const { data: row } = await supabase.from("monetization_pricing_history").select("*").eq("id", parsed.data.historyId).maybeSingle();
  if (!row || row.rolled_back) return { ok: false, error: "History entry not found or already rolled back" };

  if (row.category === "venue" && row.field_name === "booking_fee_cents" && row.old_value != null) {
    await supabase.from("monetization_venue_tiers").update({ booking_fee_cents: row.old_value, updated_at: new Date().toISOString() }).eq("tier_id", row.entity_key);
  }

  await supabase.from("monetization_pricing_history").update({ rolled_back: true }).eq("id", parsed.data.historyId);
  revalidateAll();
  return { ok: true };
}

export async function updateSponsorTierAction(input: unknown): Promise<MonetizationActionResult> {
  await requireAdmin("/admin/monetization/sponsor");
  const parsed = z.object({
    tierId: z.string(),
    name: z.string().optional(),
    annualPriceDollars: z.number().min(0),
    monthlyPriceDollars: z.number().min(0),
    regularAnnualPriceDollars: z.number().min(0),
    setupFeeDollars: z.number().min(0).optional(),
    futureGrowthPriceDollars: z.number().min(0).optional(),
    futureEnterpriseLabel: z.string().optional(),
    isActive: z.boolean().optional(),
    visibility: z.string().optional(),
    reason: z.string().optional(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid sponsor tier" };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const patch = {
    name: parsed.data.name,
    annual_price_cents: Math.round(parsed.data.annualPriceDollars * 100),
    monthly_price_cents: Math.round(parsed.data.monthlyPriceDollars * 100),
    regular_annual_price_cents: Math.round(parsed.data.regularAnnualPriceDollars * 100),
    setup_fee_cents: parsed.data.setupFeeDollars != null ? Math.round(parsed.data.setupFeeDollars * 100) : undefined,
    future_growth_price_cents: parsed.data.futureGrowthPriceDollars != null ? Math.round(parsed.data.futureGrowthPriceDollars * 100) : null,
    future_enterprise_label: parsed.data.futureEnterpriseLabel ?? null,
    is_active: parsed.data.isActive,
    visibility: parsed.data.visibility,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("monetization_sponsor_tiers").update(patch).eq("tier_id", parsed.data.tierId);
  if (error) return { ok: false, error: error.message };

  await logHistory(supabase, {
    category: "sponsor", entityKey: parsed.data.tierId, fieldName: "tier",
    oldValue: null, newValue: patch, reason: parsed.data.reason, userId: userData.user?.id,
  });
  revalidateAll();
  return { ok: true };
}

export async function createSponsorTierAction(input: unknown): Promise<MonetizationActionResult> {
  await requireAdmin("/admin/monetization/sponsor");
  const parsed = z.object({
    tierId: z.string().min(2),
    name: z.string().min(2),
    annualPriceDollars: z.number().min(0),
    monthlyPriceDollars: z.number().min(0),
    regularAnnualPriceDollars: z.number().min(0),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid sponsor tier" };

  const supabase = await createClient();
  const { data, error } = await supabase.from("monetization_sponsor_tiers").insert({
    tier_id: parsed.data.tierId,
    name: parsed.data.name,
    annual_price_cents: Math.round(parsed.data.annualPriceDollars * 100),
    monthly_price_cents: Math.round(parsed.data.monthlyPriceDollars * 100),
    regular_annual_price_cents: Math.round(parsed.data.regularAnnualPriceDollars * 100),
  }).select("tier_id").single();
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true, id: data.tier_id as string };
}

export async function archiveSponsorTierAction(input: unknown): Promise<MonetizationActionResult> {
  await requireAdmin("/admin/monetization/sponsor");
  const parsed = z.object({ tierId: z.string() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid tier id" };
  const supabase = await createClient();
  const { error } = await supabase.from("monetization_sponsor_tiers").update({ is_active: false, visibility: "hidden" }).eq("tier_id", parsed.data.tierId);
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function updateFounderPricingAction(input: unknown): Promise<MonetizationActionResult> {
  await requireAdmin("/admin/monetization/founder");
  const parsed = z.object({
    tierId: z.string(),
    founderAnnualDollars: z.number().min(0),
    founderMonthlyDollars: z.number().min(0),
    regularAnnualDollars: z.number().min(0),
    inviteOnly: z.boolean().optional(),
    lifetimePricing: z.boolean().optional(),
    customGroup: z.string().optional(),
    expiresAt: z.string().optional(),
    usageLimit: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
    reason: z.string().optional(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid founder pricing" };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const patch = {
    founder_annual_cents: Math.round(parsed.data.founderAnnualDollars * 100),
    founder_monthly_cents: Math.round(parsed.data.founderMonthlyDollars * 100),
    regular_annual_cents: Math.round(parsed.data.regularAnnualDollars * 100),
    invite_only: parsed.data.inviteOnly ?? false,
    lifetime_pricing: parsed.data.lifetimePricing ?? false,
    custom_group: parsed.data.customGroup ?? null,
    expires_at: parsed.data.expiresAt || null,
    usage_limit: parsed.data.usageLimit ?? null,
    is_active: parsed.data.isActive ?? true,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("monetization_founder_pricing").upsert(
    { tier_id: parsed.data.tierId, ...patch },
    { onConflict: "tier_id" }
  );
  if (error) return { ok: false, error: error.message };

  await logHistory(supabase, {
    category: "founder", entityKey: parsed.data.tierId, fieldName: "founder_pricing",
    oldValue: null, newValue: patch, reason: parsed.data.reason, userId: userData.user?.id,
  });
  revalidateAll();
  return { ok: true };
}

export async function updateFounderProgramAction(input: unknown): Promise<MonetizationActionResult> {
  await requireAdmin("/admin/monetization/founder");
  const parsed = z.object({
    badge: z.string().optional(),
    headline: z.string().optional(),
    subheadline: z.string().optional(),
    sectionTitle: z.string().optional(),
    timerMessage: z.string().optional(),
    legalNote: z.string().optional(),
    expiresAt: z.string().optional(),
    usageLimit: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid founder program" };

  const supabase = await createClient();
  const d = parsed.data;
  const { error } = await supabase.from("monetization_founder_program").update({
    badge: d.badge,
    headline: d.headline,
    subheadline: d.subheadline,
    section_title: d.sectionTitle,
    timer_message: d.timerMessage,
    legal_note: d.legalNote,
    expires_at: d.expiresAt || null,
    usage_limit: d.usageLimit ?? null,
    is_active: d.isActive,
    updated_at: new Date().toISOString(),
  }).eq("id", "default");
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function markAdminNotificationReadAction(input: unknown): Promise<MonetizationActionResult> {
  await requireAdmin("/admin/monetization/notifications");
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid notification id" };
  const supabase = await createClient();
  await supabase.from("monetization_admin_notifications").update({ is_read: true }).eq("id", parsed.data.id);
  revalidatePath("/admin/monetization/notifications");
  return { ok: true };
}

export async function archiveAdminNotificationAction(input: unknown): Promise<MonetizationActionResult> {
  await requireAdmin("/admin/monetization/notifications");
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid notification id" };
  const supabase = await createClient();
  await supabase.from("monetization_admin_notifications").update({ is_archived: true, is_read: true }).eq("id", parsed.data.id);
  revalidatePath("/admin/monetization/notifications");
  return { ok: true };
}

export async function validatePricingPublishAction(): Promise<
  { ok: true; issues: Array<{ severity: string; message: string }> } | { ok: false; error: string }
> {
  await requireAdmin("/admin/monetization");
  const { getMonetizationSnapshot } = await import("@/lib/monetization/pricing-resolver.server");
  const { getBusinessRulesSnapshot } = await import("@/lib/business-rules/rules-resolver.server");
  const { validatePricingSnapshot, hasBlockingValidationErrors } = await import("@/lib/monetization/validation.server");

  const [snapshot, rulesSnapshot] = await Promise.all([getMonetizationSnapshot(), getBusinessRulesSnapshot()]);
  const issues = validatePricingSnapshot(snapshot, rulesSnapshot.rules);
  if (hasBlockingValidationErrors(issues)) {
    return { ok: false, error: issues.filter((i) => i.severity === "error").map((i) => i.message).join("; ") };
  }
  return { ok: true, issues: issues.map((i) => ({ severity: i.severity, message: i.message })) };
}
