import "server-only";

import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  MonetizationAgencyPlan,
  MonetizationSnapshot,
  MonetizationTaxConfig,
  MonetizationTicketConfig,
  MonetizationVenueTier,
  MonetizationVisibility,
  VenueTierId,
} from "@/lib/monetization/types";

const CACHE_TAG = "monetization-pricing";

function asVisibility(v: unknown): MonetizationVisibility {
  const allowed = ["enabled", "disabled", "hidden", "coming_soon", "beta_only", "agency_only", "admin_only"];
  return allowed.includes(String(v)) ? (v as MonetizationVisibility) : "enabled";
}

function mapVenue(row: Record<string, unknown>): MonetizationVenueTier {
  return {
    tierId: row.tier_id as VenueTierId,
    name: row.name as string,
    bookingFeeCents: Number(row.booking_fee_cents ?? 0),
    minBookingFeeCents: row.min_booking_fee_cents != null ? Number(row.min_booking_fee_cents) : null,
    maxBookingFeeCents: row.max_booking_fee_cents != null ? Number(row.max_booking_fee_cents) : null,
    isActive: Boolean(row.is_active),
    visibility: asVisibility(row.visibility),
    earlyBirdDiscountPercent: Number(row.early_bird_discount_percent ?? 0),
    bulkBookingDiscountPercent: Number(row.bulk_booking_discount_percent ?? 0),
    agencyDiscountPercent: Number(row.agency_discount_percent ?? 0),
    weekendMultiplier: Number(row.weekend_multiplier ?? 1),
    peakHourMultiplier: Number(row.peak_hour_multiplier ?? 1),
    holidayMultiplier: Number(row.holiday_multiplier ?? 1),
    promoBookingFeeCents: row.promo_booking_fee_cents != null ? Number(row.promo_booking_fee_cents) : null,
    promoStartsAt: (row.promo_starts_at as string) ?? null,
    promoEndsAt: (row.promo_ends_at as string) ?? null,
    effectiveAt: (row.effective_at as string) ?? new Date().toISOString(),
    scheduledFeeCents: row.scheduled_fee_cents != null ? Number(row.scheduled_fee_cents) : null,
    scheduledEffectiveAt: (row.scheduled_effective_at as string) ?? null,
    requiresApproval: Boolean(row.requires_approval),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapTicket(row: Record<string, unknown> | null): MonetizationTicketConfig {
  const r = row ?? {};
  return {
    platformFeePercent: Number(r.platform_fee_percent ?? 10),
    flatTicketFeeCents: Number(r.flat_ticket_fee_cents ?? 0),
    minPlatformFeeCents: Number(r.min_platform_fee_cents ?? 0),
    maxPlatformFeeCents: r.max_platform_fee_cents != null ? Number(r.max_platform_fee_cents) : null,
    vipFeePercent: Number(r.vip_fee_percent ?? 0),
    replayFeePercent: Number(r.replay_fee_percent ?? 0),
    festivalPassFeePercent: Number(r.festival_pass_fee_percent ?? 0),
    serviceFeePercent: Number(r.service_fee_percent ?? 0),
    refundFeeCents: Number(r.refund_fee_cents ?? 0),
    chargebackFeeCents: Number(r.chargeback_fee_cents ?? 0),
    lateCancellationFeeCents: Number(r.late_cancellation_fee_cents ?? 0),
    paymentProcessingRatePercent: Number(r.payment_processing_rate_percent ?? 2.9),
    paymentProcessingFixedCents: Number(r.payment_processing_fixed_cents ?? 30),
    stripeConnectEnabled: Boolean(r.stripe_connect_enabled),
    visibility: asVisibility(r.visibility),
    updatedAt: (r.updated_at as string) ?? null,
  };
}

function mapAgencyPlan(row: Record<string, unknown>): MonetizationAgencyPlan {
  return {
    planId: row.plan_id as string,
    name: row.name as string,
    tagline: (row.tagline as string) ?? "",
    priceCents: Number(row.price_cents ?? 0),
    annualPriceCents: row.annual_price_cents != null ? Number(row.annual_price_cents) : null,
    monthlyDiscountPercent: Number(row.monthly_discount_percent ?? 0),
    annualDiscountPercent: Number(row.annual_discount_percent ?? 0),
    promoPriceCents: row.promo_price_cents != null ? Number(row.promo_price_cents) : null,
    promoStartsAt: (row.promo_starts_at as string) ?? null,
    promoEndsAt: (row.promo_ends_at as string) ?? null,
    trialDays: Number(row.trial_days ?? 0),
    artistLimit: row.artist_limit != null ? Number(row.artist_limit) : null,
    staffLimit: row.staff_limit != null ? Number(row.staff_limit) : null,
    includedUsers: row.included_users != null ? Number(row.included_users) : null,
    promotionalCreditsCents: Number(row.promotional_credits_cents ?? 0),
    includedVenueTiers: (row.included_venue_tiers as VenueTierId[]) ?? [],
    supportLevel: (row.support_level as string) ?? "standard",
    featureToggles: (row.feature_toggles as Record<string, boolean>) ?? {},
    customEnterprise: Boolean(row.custom_enterprise),
    visibility: asVisibility(row.visibility),
    isPopular: Boolean(row.is_popular),
    features: Array.isArray(row.features) ? (row.features as string[]) : [],
    highlights: Array.isArray(row.highlights) ? (row.highlights as string[]) : [],
    effectiveAt: (row.effective_at as string) ?? new Date().toISOString(),
    scheduledPriceCents: row.scheduled_price_cents != null ? Number(row.scheduled_price_cents) : null,
    scheduledEffectiveAt: (row.scheduled_effective_at as string) ?? null,
    sortOrder: Number(row.sort_order ?? 0),
  };
}

async function loadMonetizationSnapshotUncached(): Promise<MonetizationSnapshot> {
  try {
    const { ensureMonetizationBootstrap } = await import("@/lib/monetization/bootstrap.server");
    await ensureMonetizationBootstrap();

    const supabase = await createClient();
    const [
      venuesRes, ticketRes, plansRes, creditsRes, promosRes, taxRes, payoutRes,
      flagsRes, sponsorTiersRes, sponsorAddonsRes, contractsRes, founderPricingRes, founderProgramRes,
    ] = await Promise.all([
      supabase.from("monetization_venue_tiers").select("*").order("sort_order"),
      supabase.from("monetization_ticket_config").select("*").eq("id", "default").maybeSingle(),
      supabase.from("monetization_agency_plans").select("*").order("sort_order"),
      supabase.from("monetization_marketing_credits").select("*"),
      supabase.from("monetization_promotion_products").select("*").order("sort_order"),
      supabase.from("monetization_tax_config").select("*").eq("id", "default").maybeSingle(),
      supabase.from("monetization_payout_config").select("*").eq("id", "default").maybeSingle(),
      supabase.from("monetization_feature_flags").select("*").order("flag_key"),
      supabase.from("monetization_sponsor_tiers").select("*").order("sort_order"),
      supabase.from("monetization_sponsor_addons").select("*").order("sort_order"),
      supabase.from("monetization_sponsor_contract_options").select("*").order("sort_order"),
      supabase.from("monetization_founder_pricing").select("*"),
      supabase.from("monetization_founder_program").select("*").eq("id", "default").maybeSingle(),
    ]);

    const taxRow = taxRes.data as Record<string, unknown> | null;
    const payoutRow = payoutRes.data as Record<string, unknown> | null;
    const founderRow = founderProgramRes.data as Record<string, unknown> | null;

    return {
      venues: (venuesRes.data ?? []).map((r) => mapVenue(r as Record<string, unknown>)),
      tickets: mapTicket(ticketRes.data as Record<string, unknown> | null),
      agencyPlans: (plansRes.data ?? []).map((r) => mapAgencyPlan(r as Record<string, unknown>)),
      marketingCredits: (creditsRes.data ?? []).map((r) => ({
        planId: r.plan_id as string,
        includedCreditsCents: Number(r.included_credits_cents ?? 0),
        expirationDays: r.expiration_days != null ? Number(r.expiration_days) : null,
        rolloverEnabled: Boolean(r.rollover_enabled),
        additionalCreditPriceCents: r.additional_credit_price_cents != null ? Number(r.additional_credit_price_cents) : null,
      })),
      promotions: (promosRes.data ?? []).map((r) => ({
        slug: r.slug as string,
        name: r.name as string,
        priceCents: Number(r.price_cents ?? 0),
        visibility: asVisibility(r.visibility),
        isActive: Boolean(r.is_active),
        sortOrder: Number(r.sort_order ?? 0),
      })),
      taxes: {
        salesTaxPercent: Number(taxRow?.sales_tax_percent ?? 0),
        vatPercent: Number(taxRow?.vat_percent ?? 0),
        gstPercent: Number(taxRow?.gst_percent ?? 0),
        processingFeeDisplay: (taxRow?.processing_fee_display as string) ?? "separate",
        platformFeeDisplay: (taxRow?.platform_fee_display as string) ?? "itemized",
        regionalRules: Array.isArray(taxRow?.regional_rules) ? (taxRow!.regional_rules as MonetizationTaxConfig["regionalRules"]) : [],
      },
      payouts: {
        payoutDelayDays: Number(payoutRow?.payout_delay_days ?? 3),
        minPayoutCents: Number(payoutRow?.min_payout_cents ?? 1000),
        maxPayoutCents: payoutRow?.max_payout_cents != null ? Number(payoutRow.max_payout_cents) : null,
        reservePercent: Number(payoutRow?.reserve_percent ?? 0),
        manualReviewThresholdCents: Number(payoutRow?.manual_review_threshold_cents ?? 100000),
        stripeConnectReady: Boolean(payoutRow?.stripe_connect_ready),
      },
      featureFlags: (flagsRes.data ?? []).map((r) => ({
        flagKey: r.flag_key as string,
        label: r.label as string,
        description: (r.description as string) ?? null,
        visibility: asVisibility(r.visibility),
        isEnabled: Boolean(r.is_enabled ?? true),
        rolloutPercent: Number(r.rollout_percent ?? 100),
        rolloutRegions: Array.isArray(r.rollout_regions) ? (r.rollout_regions as string[]) : [],
        rolloutRoles: Array.isArray(r.rollout_roles) ? (r.rollout_roles as string[]) : [],
        startsAt: (r.starts_at as string) ?? null,
        endsAt: (r.ends_at as string) ?? null,
        version: Number(r.version ?? 1),
      })),
      sponsorTiers: (sponsorTiersRes.data ?? []).map((r) => ({
        tierId: r.tier_id as string,
        name: r.name as string,
        annualPriceCents: Number(r.annual_price_cents ?? 0),
        monthlyPriceCents: Number(r.monthly_price_cents ?? 0),
        regularAnnualPriceCents: Number(r.regular_annual_price_cents ?? 0),
        setupFeeCents: Number(r.setup_fee_cents ?? 0),
        futureGrowthPriceCents: r.future_growth_price_cents != null ? Number(r.future_growth_price_cents) : null,
        futureEnterpriseLabel: (r.future_enterprise_label as string) ?? null,
        isActive: Boolean(r.is_active),
        visibility: asVisibility(r.visibility),
        sortOrder: Number(r.sort_order ?? 0),
      })),
      sponsorAddons: (sponsorAddonsRes.data ?? []).map((r) => ({
        slug: r.slug as string,
        name: r.name as string,
        monthlyPriceCents: Number(r.monthly_price_cents ?? 0),
        annualPriceCents: Number(r.annual_price_cents ?? 0),
        category: (r.category as string) ?? "general",
        isActive: Boolean(r.is_active),
        sortOrder: Number(r.sort_order ?? 0),
      })),
      sponsorContracts: (contractsRes.data ?? []).map((r) => ({
        id: r.id as string,
        years: Number(r.years ?? 0),
        discountPercent: Number(r.discount_percent ?? 0),
        label: r.label as string,
      })),
      founderPricing: (founderPricingRes.data ?? []).map((r) => ({
        tierId: r.tier_id as string,
        founderAnnualCents: Number(r.founder_annual_cents ?? 0),
        founderMonthlyCents: Number(r.founder_monthly_cents ?? 0),
        regularAnnualCents: Number(r.regular_annual_cents ?? 0),
        inviteOnly: Boolean(r.invite_only),
        lifetimePricing: Boolean(r.lifetime_pricing),
        customGroup: (r.custom_group as string) ?? null,
        expiresAt: (r.expires_at as string) ?? null,
        isActive: Boolean(r.is_active),
      })),
      founderProgram: founderRow
        ? {
            badge: founderRow.badge as string,
            headline: founderRow.headline as string,
            subheadline: founderRow.subheadline as string,
            sectionTitle: founderRow.section_title as string,
            timerTitle: founderRow.timer_title as string,
            timerSubtitle: founderRow.timer_subtitle as string,
            timerMessage: founderRow.timer_message as string,
            legalNote: founderRow.legal_note as string,
            isActive: Boolean(founderRow.is_active),
            expiresAt: (founderRow.expires_at as string) ?? null,
          }
        : null,
      loadedAt: new Date().toISOString(),
    };
  } catch {
    return emptySnapshot();
  }
}

function emptySnapshot(): MonetizationSnapshot {
  return {
    venues: [],
    tickets: mapTicket(null),
    agencyPlans: [],
    marketingCredits: [],
    promotions: [],
    taxes: { salesTaxPercent: 0, vatPercent: 0, gstPercent: 0, processingFeeDisplay: "separate", platformFeeDisplay: "itemized", regionalRules: [] },
    payouts: { payoutDelayDays: 3, minPayoutCents: 1000, maxPayoutCents: null, reservePercent: 0, manualReviewThresholdCents: 100000, stripeConnectReady: false },
    featureFlags: [],
    sponsorTiers: [],
    sponsorAddons: [],
    sponsorContracts: [],
    founderPricing: [],
    founderProgram: null,
    loadedAt: new Date().toISOString(),
  };
}

export const getMonetizationSnapshot = unstable_cache(
  loadMonetizationSnapshotUncached,
  [CACHE_TAG],
  { revalidate: 60, tags: [CACHE_TAG] }
);

export function getVenueTier(snapshot: MonetizationSnapshot, tierId: VenueTierId): MonetizationVenueTier | undefined {
  return snapshot.venues.find((v) => v.tierId === tierId);
}

export function getAgencyPlan(snapshot: MonetizationSnapshot, planId: string): MonetizationAgencyPlan | undefined {
  return snapshot.agencyPlans.find((p) => p.planId === planId);
}

export function bookingFeeDollarsFromSnapshot(snapshot: MonetizationSnapshot, tierId: VenueTierId): number | null {
  const tier = getVenueTier(snapshot, tierId);
  if (!tier) return null;
  if (tier.requiresApproval && tierId === "stadium") return null;
  return tier.bookingFeeCents / 100;
}

export const MONETIZATION_CACHE_TAG = CACHE_TAG;
