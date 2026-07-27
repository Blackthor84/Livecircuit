import { ARENA_TIER_OPTIONS } from "@/lib/demo/naming-rights-data";
import type { FanJourneyStepId } from "@/lib/demo/fan-journey-data";

export type FanJourneyStepMetrics = {
  reach: number;
  impressions: number;
  engagement: number;
  clicks?: number;
  ctr?: number;
  businessValue: string;
};

export type BrandImpactTotals = {
  fansReached: number;
  digitalImpressions: number;
  livestreamViews: number;
  emailOpens: number;
  pushNotifications: number;
  ticketPurchases: number;
  chatMessages: number;
  socialShares: number;
  repeatVisitors: number;
  brandRecall: number;
};

const STEP_MULTIPLIERS: Record<FanJourneyStepId, { imp: number; eng: number }> = {
  discovery: { imp: 1.8, eng: 0.12 },
  "event-page": { imp: 0.9, eng: 0.22 },
  "ticket-purchase": { imp: 0.35, eng: 0.45 },
  "email-confirmation": { imp: 0.5, eng: 0.38 },
  "push-notification": { imp: 0.4, eng: 0.52 },
  "entering-arena": { imp: 0.85, eng: 0.65 },
  "pre-show": { imp: 0.75, eng: 0.58 },
  "live-performance": { imp: 1.2, eng: 0.78 },
  "fan-engagement": { imp: 0.6, eng: 0.82 },
  "vip-experience": { imp: 0.15, eng: 0.91 },
  "post-show": { imp: 0.55, eng: 0.48 },
  "social-sharing": { imp: 0.45, eng: 0.35 },
  "return-visit": { imp: 0.95, eng: 0.55 },
};

export function getFanJourneyStepMetrics(
  stepId: FanJourneyStepId,
  expectedAttendance: number,
  tierId: string
): FanJourneyStepMetrics {
  const tier = ARENA_TIER_OPTIONS.find((t) => t.id === tierId) ?? ARENA_TIER_OPTIONS[2];
  const reach = Math.round(expectedAttendance * (tier.monthlyVisitors / tier.maxCapacity) * 2.5);
  const mult = STEP_MULTIPLIERS[stepId];
  const impressions = Math.round(reach * mult.imp);
  const engagement = Math.round(reach * mult.eng);
  const clicks = Math.round(impressions * (0.04 + mult.eng * 0.02));
  const ctr = impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0;

  return { reach, impressions, engagement, clicks, ctr, businessValue: "" };
}

export function getBrandImpactTotals(
  expectedAttendance: number,
  tierId: string,
  contractYears: number
): BrandImpactTotals {
  const tier = ARENA_TIER_OPTIONS.find((t) => t.id === tierId) ?? ARENA_TIER_OPTIONS[2];
  const fansReached = Math.round(expectedAttendance * 1.35);
  const annualEvents = tier.annualEvents;

  return {
    fansReached,
    digitalImpressions: Math.round(fansReached * 14 * annualEvents * contractYears * 0.001) * 1000,
    livestreamViews: Math.round(expectedAttendance * 2.8),
    emailOpens: Math.round(fansReached * 0.52),
    pushNotifications: Math.round(fansReached * 0.65),
    ticketPurchases: Math.round(expectedAttendance * 0.88),
    chatMessages: Math.round(fansReached * 2.4),
    socialShares: Math.round(fansReached * 0.18),
    repeatVisitors: Math.round(fansReached * 0.42),
    brandRecall: 73,
  };
}

export function formatMetric(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}
