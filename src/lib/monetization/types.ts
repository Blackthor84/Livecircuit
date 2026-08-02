export type MonetizationVisibility =
  | "enabled"
  | "disabled"
  | "hidden"
  | "coming_soon"
  | "beta_only"
  | "agency_only"
  | "admin_only";

export type VenueTierId = "community" | "club" | "theater" | "arena" | "stadium";

export type MonetizationVenueTier = {
  tierId: VenueTierId;
  name: string;
  bookingFeeCents: number;
  minBookingFeeCents: number | null;
  maxBookingFeeCents: number | null;
  isActive: boolean;
  visibility: MonetizationVisibility;
  earlyBirdDiscountPercent: number;
  bulkBookingDiscountPercent: number;
  agencyDiscountPercent: number;
  weekendMultiplier: number;
  peakHourMultiplier: number;
  holidayMultiplier: number;
  promoBookingFeeCents: number | null;
  promoStartsAt: string | null;
  promoEndsAt: string | null;
  effectiveAt: string;
  scheduledFeeCents: number | null;
  scheduledEffectiveAt: string | null;
  requiresApproval: boolean;
  sortOrder: number;
};

export type MonetizationTicketConfig = {
  platformFeePercent: number;
  flatTicketFeeCents: number;
  minPlatformFeeCents: number;
  maxPlatformFeeCents: number | null;
  vipFeePercent: number;
  replayFeePercent: number;
  festivalPassFeePercent: number;
  serviceFeePercent: number;
  refundFeeCents: number;
  chargebackFeeCents: number;
  lateCancellationFeeCents: number;
  paymentProcessingRatePercent: number;
  paymentProcessingFixedCents: number;
  stripeConnectEnabled: boolean;
  visibility: MonetizationVisibility;
  updatedAt: string | null;
};

export type MonetizationAgencyPlan = {
  planId: string;
  name: string;
  tagline: string;
  priceCents: number;
  annualPriceCents: number | null;
  monthlyDiscountPercent: number;
  annualDiscountPercent: number;
  promoPriceCents: number | null;
  promoStartsAt: string | null;
  promoEndsAt: string | null;
  trialDays: number;
  artistLimit: number | null;
  staffLimit: number | null;
  includedUsers: number | null;
  promotionalCreditsCents: number;
  includedVenueTiers: VenueTierId[];
  supportLevel: string;
  featureToggles: Record<string, boolean>;
  customEnterprise: boolean;
  visibility: MonetizationVisibility;
  isPopular: boolean;
  features: string[];
  highlights: string[];
  effectiveAt: string;
  scheduledPriceCents: number | null;
  scheduledEffectiveAt: string | null;
  sortOrder: number;
};

export type MonetizationMarketingCredits = {
  planId: string;
  includedCreditsCents: number;
  expirationDays: number | null;
  rolloverEnabled: boolean;
  additionalCreditPriceCents: number | null;
};

export type MonetizationPromotionProduct = {
  slug: string;
  name: string;
  priceCents: number;
  visibility: MonetizationVisibility;
  isActive: boolean;
  sortOrder: number;
};

export type MonetizationCoupon = {
  id: string;
  code: string;
  name: string | null;
  discountType: "percent" | "fixed";
  discountValue: number;
  appliesTo: string;
  usageLimit: number | null;
  usageCount: number;
  expiresAt: string | null;
  isActive: boolean;
  visibility: MonetizationVisibility;
  createdAt: string;
};

export type MonetizationTaxConfig = {
  salesTaxPercent: number;
  vatPercent: number;
  gstPercent: number;
  processingFeeDisplay: string;
  platformFeeDisplay: string;
  regionalRules: { region: string; ratePercent: number; label: string }[];
};

export type MonetizationPayoutConfig = {
  payoutDelayDays: number;
  minPayoutCents: number;
  maxPayoutCents: number | null;
  reservePercent: number;
  manualReviewThresholdCents: number;
  stripeConnectReady: boolean;
};

export type MonetizationPricingHistoryRow = {
  id: string;
  category: string;
  entityKey: string;
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string | null;
  changedBy: string | null;
  changedAt: string;
  rolledBack: boolean;
  adminName?: string | null;
};

export type MonetizationScheduledPricing = {
  id: string;
  category: string;
  entityKey: string;
  changes: Record<string, unknown>;
  effectiveAt: string;
  status: string;
  createdAt: string;
};

import type {
  MonetizationFeatureFlag,
  MonetizationFounderPricing,
  MonetizationFounderProgram,
  MonetizationSponsorAddon,
  MonetizationSponsorContractOption,
  MonetizationSponsorTier,
} from "@/lib/monetization/extended-types";

export type MonetizationAnalytics = {
  avgVenueRevenueCents: number;
  avgTicketRevenueCents: number;
  mostBookedVenue: string | null;
  revenueByVenue: { name: string; cents: number }[];
  revenueByMonth: { month: string; cents: number }[];
  avgTicketPriceCents: number;
  bookingConversionPercent: number;
  cancelledBookings: number;
};

/** Full resolved pricing snapshot for the application. */
export type MonetizationSnapshot = {
  venues: MonetizationVenueTier[];
  tickets: MonetizationTicketConfig;
  agencyPlans: MonetizationAgencyPlan[];
  marketingCredits: MonetizationMarketingCredits[];
  promotions: MonetizationPromotionProduct[];
  taxes: MonetizationTaxConfig;
  payouts: MonetizationPayoutConfig;
  featureFlags: MonetizationFeatureFlag[];
  sponsorTiers: MonetizationSponsorTier[];
  sponsorAddons: MonetizationSponsorAddon[];
  sponsorContracts: MonetizationSponsorContractOption[];
  founderPricing: MonetizationFounderPricing[];
  founderProgram: MonetizationFounderProgram | null;
  loadedAt: string;
};

export function effectiveVenueFeeCents(tier: MonetizationVenueTier, now = new Date()): number | null {
  if (!tier.isActive || tier.visibility === "disabled" || tier.visibility === "hidden") return null;
  if (tier.requiresApproval && tier.tierId === "stadium") return null;

  if (
    tier.scheduledFeeCents != null &&
    tier.scheduledEffectiveAt &&
    now >= new Date(tier.scheduledEffectiveAt)
  ) {
    return tier.scheduledFeeCents;
  }

  const promoActive =
    tier.promoBookingFeeCents != null &&
    tier.promoStartsAt &&
    tier.promoEndsAt &&
    now >= new Date(tier.promoStartsAt) &&
    now <= new Date(tier.promoEndsAt);
  if (promoActive) return tier.promoBookingFeeCents;
  return tier.bookingFeeCents;
}

export function effectiveAgencyPriceCents(plan: MonetizationAgencyPlan, now = new Date()): number {
  if (
    plan.scheduledPriceCents != null &&
    plan.scheduledEffectiveAt &&
    now >= new Date(plan.scheduledEffectiveAt)
  ) {
    return plan.scheduledPriceCents;
  }
  if (
    plan.promoPriceCents != null &&
    plan.promoStartsAt &&
    plan.promoEndsAt &&
    now >= new Date(plan.promoStartsAt) &&
    now <= new Date(plan.promoEndsAt)
  ) {
    return plan.promoPriceCents;
  }
  return plan.priceCents;
}

export function venueFeeDollars(tier: MonetizationVenueTier): string {
  const cents = effectiveVenueFeeCents(tier);
  if (cents == null) return "Custom pricing";
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export type {
  MonetizationFeatureFlag,
  MonetizationFounderPricing,
  MonetizationFounderProgram,
  MonetizationSponsorAddon,
  MonetizationSponsorContractOption,
  MonetizationSponsorTier,
  AgencyComparisonRow,
  CouponEffectType,
  CouponValidationResult,
} from "@/lib/monetization/extended-types";
