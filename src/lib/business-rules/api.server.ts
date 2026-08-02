import "server-only";

import { evaluateBusinessRules } from "@/lib/business-rules/engine";
import { getBusinessRulesSnapshot } from "@/lib/business-rules/rules-resolver.server";
import type { RuleEvaluationContext } from "@/lib/business-rules/types";
import { serializeEngineState } from "@/lib/business-rules/types";
import {
  getMonetizationSnapshot,
  getVenueTier,
} from "@/lib/monetization/pricing-resolver.server";
import type { MonetizationSnapshot, VenueTierId } from "@/lib/monetization/types";
import { effectiveVenueFeeCents } from "@/lib/monetization/types";

export type VenuePriceBreakdown = {
  baseFeeCents: number;
  finalFeeCents: number;
  discountCents: number;
  surchargeCents: number;
  isFree: boolean;
  steps: { label: string; cents: number }[];
};

export type VenuePriceResult = {
  feeCents: number;
  feeDollars: number;
  isFree: boolean;
  breakdown: VenuePriceBreakdown;
  appliedRules: ReturnType<typeof evaluateBusinessRules>["appliedRules"];
  ignoredRules: ReturnType<typeof evaluateBusinessRules>["ignoredRules"];
  conflicts: ReturnType<typeof evaluateBusinessRules>["conflicts"];
};

export type VenueBookingEligibility = {
  allowed: boolean;
  reason: string | null;
  requiresApproval: boolean;
  requiresManualReview: boolean;
  autoApprove: boolean;
  includedInPlan: boolean;
  appliedRules: ReturnType<typeof evaluateBusinessRules>["appliedRules"];
};

export type TicketFeeResult = {
  platformFeePercent: number;
  flatFeeCents: number;
  appliedRules: ReturnType<typeof evaluateBusinessRules>["appliedRules"];
};

export type AgencyBenefitsResult = {
  freeVenueTiers: VenueTierId[];
  promotionCreditsCents: number;
  featuresUnlocked: string[];
  earlyBookingAccess: boolean;
  priorityScheduling: boolean;
  homepageFeature: boolean;
  appliedRules: ReturnType<typeof evaluateBusinessRules>["appliedRules"];
};

export type FeatureAccessResult = {
  features: Record<string, { available: boolean; visibility: string; locked: boolean }>;
  enableBetaFeatures: boolean;
  appliedRules: ReturnType<typeof evaluateBusinessRules>["appliedRules"];
};

export type DiscountResult = {
  venueDiscountPercent: number;
  venueSurchargePercent: number;
  couponCode: string | null;
  creditsCents: number;
  appliedRules: ReturnType<typeof evaluateBusinessRules>["appliedRules"];
};

export type SimulationResult = {
  context: RuleEvaluationContext;
  venuePrice: VenuePriceResult;
  ticketFee: TicketFeeResult;
  booking: VenueBookingEligibility;
  discounts: DiscountResult;
  agencyBenefits: AgencyBenefitsResult | null;
  features: FeatureAccessResult;
  engineState: ReturnType<typeof serializeEngineState>;
};

function resolveBaseVenueFeeCents(
  snapshot: MonetizationSnapshot,
  tierId: VenueTierId,
  now: Date
): number {
  const tier = getVenueTier(snapshot, tierId);
  if (!tier) return 0;
  return effectiveVenueFeeCents(tier, now) ?? tier.bookingFeeCents;
}

function applyTierMultipliers(
  baseCents: number,
  snapshot: MonetizationSnapshot,
  tierId: VenueTierId,
  state: ReturnType<typeof evaluateBusinessRules>["state"],
  ctx: RuleEvaluationContext
): { cents: number; steps: VenuePriceBreakdown["steps"] } {
  const tier = getVenueTier(snapshot, tierId);
  if (!tier) return { cents: baseCents, steps: [{ label: "Base fee", cents: baseCents }] };

  let cents = baseCents;
  const steps: VenuePriceBreakdown["steps"] = [{ label: "Base fee", cents: baseCents }];

  if (state.applyWeekendMultiplier && ctx.isWeekend) {
    const next = Math.round(cents * tier.weekendMultiplier);
    steps.push({ label: "Weekend multiplier", cents: next - cents });
    cents = next;
  }

  if (state.applyHolidayMultiplier && ctx.isHoliday) {
    const next = Math.round(cents * tier.holidayMultiplier);
    steps.push({ label: "Holiday multiplier", cents: next - cents });
    cents = next;
  }

  if (state.applyPeakHourMultiplier && ctx.hour != null && ctx.hour >= 18 && ctx.hour <= 22) {
    const next = Math.round(cents * tier.peakHourMultiplier);
    steps.push({ label: "Peak hour multiplier", cents: next - cents });
    cents = next;
  }

  return { cents, steps };
}

export async function getVenuePrice(
  ctx: RuleEvaluationContext & { venueType: VenueTierId }
): Promise<VenuePriceResult> {
  const [monetization, rulesSnapshot] = await Promise.all([
    getMonetizationSnapshot(),
    getBusinessRulesSnapshot(),
  ]);

  const now = ctx.now ?? new Date();
  const evaluation = evaluateBusinessRules(rulesSnapshot, ctx);
  const { state } = evaluation;

  if (state.freeBooking || state.venuePriceOverrideCents === 0) {
    return {
      feeCents: 0,
      feeDollars: 0,
      isFree: true,
      breakdown: {
        baseFeeCents: 0,
        finalFeeCents: 0,
        discountCents: 0,
        surchargeCents: 0,
        isFree: true,
        steps: [{ label: "Free booking rule applied", cents: 0 }],
      },
      appliedRules: evaluation.appliedRules,
      ignoredRules: evaluation.ignoredRules,
      conflicts: evaluation.conflicts,
    };
  }

  let baseCents =
    state.venuePriceOverrideCents ??
    resolveBaseVenueFeeCents(monetization, ctx.venueType, now);

  const { cents: multipliedCents, steps } = applyTierMultipliers(
    baseCents,
    monetization,
    ctx.venueType,
    state,
    ctx
  );

  let finalCents = multipliedCents;
  let discountCents = 0;
  let surchargeCents = 0;

  if (state.venueDiscountPercent > 0) {
    discountCents = Math.round(finalCents * (state.venueDiscountPercent / 100));
    finalCents -= discountCents;
    steps.push({ label: `${state.venueDiscountPercent}% discount`, cents: -discountCents });
  }

  if (state.venueSurchargePercent > 0) {
    surchargeCents = Math.round(finalCents * (state.venueSurchargePercent / 100));
    finalCents += surchargeCents;
    steps.push({ label: `${state.venueSurchargePercent}% surcharge`, cents: surchargeCents });
  }

  const tier = getVenueTier(monetization, ctx.venueType);
  if (tier?.minBookingFeeCents != null) finalCents = Math.max(finalCents, tier.minBookingFeeCents);
  if (tier?.maxBookingFeeCents != null) finalCents = Math.min(finalCents, tier.maxBookingFeeCents);

  return {
    feeCents: finalCents,
    feeDollars: finalCents / 100,
    isFree: finalCents === 0,
    breakdown: {
      baseFeeCents: baseCents,
      finalFeeCents: finalCents,
      discountCents,
      surchargeCents,
      isFree: finalCents === 0,
      steps,
    },
    appliedRules: evaluation.appliedRules,
    ignoredRules: evaluation.ignoredRules,
    conflicts: evaluation.conflicts,
  };
}

export async function canBookVenue(
  ctx: RuleEvaluationContext & { venueType: VenueTierId }
): Promise<VenueBookingEligibility> {
  const [monetization, rulesSnapshot] = await Promise.all([
    getMonetizationSnapshot(),
    getBusinessRulesSnapshot(),
  ]);

  const evaluation = evaluateBusinessRules(rulesSnapshot, ctx);
  const { state } = evaluation;
  const tier = getVenueTier(monetization, ctx.venueType);

  if (state.bookingDisabled) {
    return {
      allowed: false,
      reason: "Booking disabled by business rule",
      requiresApproval: false,
      requiresManualReview: false,
      autoApprove: false,
      includedInPlan: false,
      appliedRules: evaluation.appliedRules,
    };
  }

  if (!tier?.isActive) {
    return {
      allowed: false,
      reason: "Venue tier is inactive",
      requiresApproval: false,
      requiresManualReview: false,
      autoApprove: false,
      includedInPlan: false,
      appliedRules: evaluation.appliedRules,
    };
  }

  if (tier.visibility === "disabled" || tier.visibility === "hidden") {
    return {
      allowed: false,
      reason: "Venue tier is not available",
      requiresApproval: false,
      requiresManualReview: false,
      autoApprove: false,
      includedInPlan: false,
      appliedRules: evaluation.appliedRules,
    };
  }

  const includedInPlan = state.freeBooking;
  const requiresApproval = tier.requiresApproval || state.requiresManualReview;
  const autoApprove = state.autoApprove && !requiresApproval;

  return {
    allowed: true,
    reason: null,
    requiresApproval,
    requiresManualReview: state.requiresManualReview,
    autoApprove,
    includedInPlan,
    appliedRules: evaluation.appliedRules,
  };
}

export async function getTicketFee(ctx: RuleEvaluationContext): Promise<TicketFeeResult> {
  const [monetization, rulesSnapshot] = await Promise.all([
    getMonetizationSnapshot(),
    getBusinessRulesSnapshot(),
  ]);

  const evaluation = evaluateBusinessRules(rulesSnapshot, ctx, { category: "ticket" });
  const allEval = evaluateBusinessRules(rulesSnapshot, ctx);
  const state = allEval.state;

  return {
    platformFeePercent: state.ticketFeePercentOverride ?? monetization.tickets.platformFeePercent,
    flatFeeCents: state.ticketFeeFlatOverrideCents ?? monetization.tickets.flatTicketFeeCents,
    appliedRules: [...evaluation.appliedRules, ...allEval.appliedRules.filter((r) =>
      r.actions.some((a) => a.type === "ticket_fee_override")
    )],
  };
}

export async function getAgencyBenefits(ctx: RuleEvaluationContext): Promise<AgencyBenefitsResult> {
  const rulesSnapshot = await getBusinessRulesSnapshot();
  const evaluation = evaluateBusinessRules(rulesSnapshot, { ...ctx, userType: "agency" });
  const { state } = evaluation;

  const freeVenueTiers: VenueTierId[] = [];
  for (const rule of evaluation.appliedRules) {
    if (rule.actions.some((a) => a.type === "free_venue_booking")) {
      const venueCond = rulesSnapshot.rules
        .find((r) => r.id === rule.ruleId)
        ?.conditions.find((c) => c.type === "venue_type");
      if (venueCond && typeof venueCond.value === "string") {
        freeVenueTiers.push(venueCond.value as VenueTierId);
      }
    }
  }

  return {
    freeVenueTiers,
    promotionCreditsCents: state.promotionCreditsCents,
    featuresUnlocked: [...state.featuresUnlocked],
    earlyBookingAccess: state.earlyBookingAccess,
    priorityScheduling: state.priorityScheduling,
    homepageFeature: state.homepageFeature,
    appliedRules: evaluation.appliedRules,
  };
}

export async function getAvailableFeatures(ctx: RuleEvaluationContext): Promise<FeatureAccessResult> {
  const rulesSnapshot = await getBusinessRulesSnapshot();
  const evaluation = evaluateBusinessRules(rulesSnapshot, ctx);
  const { state } = evaluation;

  const features: FeatureAccessResult["features"] = {};

  for (const [feature, visibility] of state.featureVisibility) {
    features[feature] = { available: visibility === "enabled", visibility, locked: false };
  }

  for (const feature of state.featuresUnlocked) {
    features[feature] = { available: true, visibility: "enabled", locked: false };
  }

  for (const feature of state.featuresLocked) {
    features[feature] = { available: false, visibility: "disabled", locked: true };
  }

  return {
    features,
    enableBetaFeatures: state.enableBetaFeatures,
    appliedRules: evaluation.appliedRules,
  };
}

export async function calculateDiscounts(ctx: RuleEvaluationContext): Promise<DiscountResult> {
  const rulesSnapshot = await getBusinessRulesSnapshot();
  const evaluation = evaluateBusinessRules(rulesSnapshot, ctx, { category: "discount" });
  const allEval = evaluateBusinessRules(rulesSnapshot, ctx);
  const { state } = allEval;

  return {
    venueDiscountPercent: state.venueDiscountPercent,
    venueSurchargePercent: state.venueSurchargePercent,
    couponCode: state.couponToApply,
    creditsCents: state.promotionCreditsCents + state.creditsToAwardCents,
    appliedRules: [...evaluation.appliedRules, ...allEval.appliedRules],
  };
}

export async function calculatePromotionCredits(ctx: RuleEvaluationContext): Promise<number> {
  const rulesSnapshot = await getBusinessRulesSnapshot();
  const evaluation = evaluateBusinessRules(rulesSnapshot, ctx, { category: "promotion" });
  return evaluation.state.promotionCreditsCents + evaluation.state.creditsToAwardCents;
}

export async function simulateBusinessRules(
  ctx: RuleEvaluationContext & { venueType?: VenueTierId }
): Promise<SimulationResult> {
  const venueType = ctx.venueType ?? "club";
  const fullCtx = { ...ctx, venueType };

  const [venuePrice, ticketFee, booking, discounts, features] = await Promise.all([
    getVenuePrice(fullCtx),
    getTicketFee(fullCtx),
    canBookVenue(fullCtx),
    calculateDiscounts(fullCtx),
    getAvailableFeatures(fullCtx),
  ]);

  const agencyBenefits =
    ctx.userType === "agency" || ctx.agencyPlan
      ? await getAgencyBenefits(fullCtx)
      : null;

  const rulesSnapshot = await getBusinessRulesSnapshot();
  const evaluation = evaluateBusinessRules(rulesSnapshot, fullCtx);

  return {
    context: fullCtx,
    venuePrice,
    ticketFee,
    booking,
    discounts,
    agencyBenefits,
    features,
    engineState: serializeEngineState(evaluation.state),
  };
}
