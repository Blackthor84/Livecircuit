import "server-only";

import type { ArenaTierId } from "@/lib/pricing/livecircuit-pricing";
import type { SponsorPricingBundle } from "@/lib/monetization/sponsor-pricing-types";
import type { MonetizationSnapshot } from "@/lib/monetization/types";
import {
  FOUNDER_PROGRAM,
  FOUNDER_SPONSOR_PRICING,
  FUTURE_ENTERPRISE_PRICING,
  FUTURE_GROWTH_PRICING,
  SPONSORSHIP_ADDONS,
  SPONSORSHIP_SETUP_FEES,
} from "@/lib/pricing/livecircuit-pricing";

export function buildSponsorPricingBundle(snapshot: MonetizationSnapshot): SponsorPricingBundle {
  const founderPricing = getFounderSponsorPricingFromSnapshot(snapshot);
  const founderProgram = getFounderProgramFromSnapshot(snapshot);
  return {
    founderPricing: Object.fromEntries(
      Object.entries(founderPricing).map(([k, v]) => [
        k,
        { annual: v.annual, monthly: v.monthly, regularAnnual: v.regularAnnual },
      ])
    ),
    founderProgram: {
      badge: founderProgram.badge,
      headline: founderProgram.headline,
      subheadline: founderProgram.subheadline,
      sectionTitle: founderProgram.sectionTitle,
      timerTitle: founderProgram.timerTitle,
      timerSubtitle: founderProgram.timerSubtitle,
      timerMessage: founderProgram.timerMessage,
      legalNote: founderProgram.legalNote,
    },
    futureGrowth: getFutureGrowthPricingFromSnapshot(snapshot),
    futureEnterprise: getFutureEnterprisePricingFromSnapshot(snapshot),
    setupFees: getSponsorSetupFeesFromSnapshot(snapshot),
    loadedAt: snapshot.loadedAt,
  };
}

export function getFounderSponsorPricingFromSnapshot(snapshot: MonetizationSnapshot) {
  if (!snapshot.founderPricing.length) {
    return FOUNDER_SPONSOR_PRICING;
  }
  const out: Record<string, { annual: number; monthly: number; regularAnnual: number }> = {};
  for (const fp of snapshot.founderPricing) {
    if (!fp.isActive) continue;
    out[fp.tierId] = {
      annual: fp.founderAnnualCents / 100,
      monthly: fp.founderMonthlyCents / 100,
      regularAnnual: fp.regularAnnualCents / 100,
    };
  }
  return { ...FOUNDER_SPONSOR_PRICING, ...out } as typeof FOUNDER_SPONSOR_PRICING;
}

export function getFounderProgramFromSnapshot(snapshot: MonetizationSnapshot) {
  return snapshot.founderProgram ?? FOUNDER_PROGRAM;
}

export function getSponsorAddonsFromSnapshot(snapshot: MonetizationSnapshot) {
  if (!snapshot.sponsorAddons.length) return SPONSORSHIP_ADDONS;
  return snapshot.sponsorAddons
    .filter((a) => a.isActive)
    .map((a) => ({
      id: a.slug,
      name: a.name,
      monthly: a.monthlyPriceCents / 100,
      annual: a.annualPriceCents / 100,
    }));
}

export function getSponsorSetupFeesFromSnapshot(snapshot: MonetizationSnapshot) {
  if (!snapshot.sponsorTiers.length) return SPONSORSHIP_SETUP_FEES;
  const out: Partial<Record<ArenaTierId, number>> = {};
  for (const t of snapshot.sponsorTiers) {
    out[t.tierId as ArenaTierId] = t.setupFeeCents / 100;
  }
  return { ...SPONSORSHIP_SETUP_FEES, ...out };
}

export function getFutureGrowthPricingFromSnapshot(snapshot: MonetizationSnapshot) {
  if (!snapshot.sponsorTiers.length) return FUTURE_GROWTH_PRICING;
  const out: Partial<Record<ArenaTierId, number>> = {};
  for (const t of snapshot.sponsorTiers) {
    if (t.futureGrowthPriceCents != null) {
      out[t.tierId as ArenaTierId] = t.futureGrowthPriceCents / 100;
    }
  }
  return { ...FUTURE_GROWTH_PRICING, ...out };
}

export function getFutureEnterprisePricingFromSnapshot(snapshot: MonetizationSnapshot) {
  if (!snapshot.sponsorTiers.length) return FUTURE_ENTERPRISE_PRICING;
  const out: Partial<Record<ArenaTierId, string>> = {};
  for (const t of snapshot.sponsorTiers) {
    if (t.futureEnterpriseLabel) out[t.tierId as ArenaTierId] = t.futureEnterpriseLabel;
  }
  return { ...FUTURE_ENTERPRISE_PRICING, ...out };
}
