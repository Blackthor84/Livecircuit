import type { MonetizationVisibility } from "@/lib/monetization/types";

export type MonetizationFeatureFlag = {
  flagKey: string;
  label: string;
  description: string | null;
  visibility: MonetizationVisibility;
  isEnabled: boolean;
  rolloutPercent: number;
  rolloutRegions: string[];
  rolloutRoles: string[];
  startsAt: string | null;
  endsAt: string | null;
  version: number;
};

export type MonetizationSponsorTier = {
  tierId: string;
  name: string;
  annualPriceCents: number;
  monthlyPriceCents: number;
  regularAnnualPriceCents: number;
  setupFeeCents: number;
  futureGrowthPriceCents: number | null;
  futureEnterpriseLabel: string | null;
  isActive: boolean;
  visibility: MonetizationVisibility;
  sortOrder: number;
};

export type MonetizationSponsorAddon = {
  slug: string;
  name: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  category: string;
  isActive: boolean;
  sortOrder: number;
};

export type MonetizationFounderPricing = {
  tierId: string;
  founderAnnualCents: number;
  founderMonthlyCents: number;
  regularAnnualCents: number;
  inviteOnly: boolean;
  lifetimePricing: boolean;
  customGroup: string | null;
  expiresAt: string | null;
  isActive: boolean;
};

export type MonetizationFounderProgram = {
  badge: string;
  headline: string;
  subheadline: string;
  sectionTitle: string;
  timerTitle: string;
  timerSubtitle: string;
  timerMessage: string;
  legalNote: string;
  isActive: boolean;
  expiresAt: string | null;
};

export type MonetizationSponsorContractOption = {
  id: string;
  years: number;
  discountPercent: number;
  label: string;
};

export type CouponEffectType =
  | "percent"
  | "fixed"
  | "free_venue"
  | "free_ticket_fee"
  | "free_credits"
  | "free_trial"
  | "bogo";

export type CouponValidationResult =
  | { valid: true; discountCents: number; effectType: CouponEffectType; couponId: string; code: string }
  | { valid: false; error: string };

export type AgencyComparisonRow = {
  label: string;
  boutique: string;
  growth: string;
  enterprise: string;
};

export function formatPlanPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function formatCreditsLabel(cents: number): string {
  return `$${Math.round(cents / 100)}/mo`;
}
