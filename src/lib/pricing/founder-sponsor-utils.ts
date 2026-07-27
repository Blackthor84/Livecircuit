import {
  ARENA_TIER_META,
  FOUNDER_SPONSOR_PRICING,
  type ArenaTierId,
  getArenaTierMeta,
} from "@/lib/pricing/livecircuit-pricing";

export type FounderSponsorRoiMetrics = {
  annualEvents: number;
  estimatedReach: number;
  livestreamViews: number;
  brandImpressions: number;
  emailOpens: number;
  pushNotifications: number;
  repeatVisitors: number;
  socialShares: number;
  chatEngagement: number;
};

export function buildArenaTierOptionsFromPricing() {
  return ARENA_TIER_META.map((tier) => {
    const founder = FOUNDER_SPONSOR_PRICING[tier.id];
    return {
      ...tier,
      investment: founder.monthly,
      annualInvestment: founder.annual,
      regularAnnualInvestment: founder.regularAnnual,
      isFounderPricing: true as const,
    };
  });
}

export function getFounderSponsorRoi(tierId: ArenaTierId, contractYears = 1): FounderSponsorRoiMetrics {
  const tier = getArenaTierMeta(tierId);
  const baseReach = tier.monthlyVisitors * 12 * contractYears;

  return {
    annualEvents: tier.annualEvents * contractYears,
    estimatedReach: Math.round(baseReach * 0.85),
    livestreamViews: Math.round(tier.maxCapacity * tier.annualEvents * 2.1),
    brandImpressions: Math.round(baseReach * 14),
    emailOpens: Math.round(baseReach * 0.48),
    pushNotifications: Math.round(baseReach * 0.62),
    repeatVisitors: Math.round(baseReach * 0.38),
    socialShares: Math.round(baseReach * 0.16),
    chatEngagement: Math.round(tier.maxCapacity * tier.annualEvents * 0.45),
  };
}
