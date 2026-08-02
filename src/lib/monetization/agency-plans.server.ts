import "server-only";

import type { AgencyPartnershipPlan } from "@/lib/agency/partnership-program";
import { AGENCY_PARTNERSHIP_PLANS } from "@/lib/agency/partnership-program";
import { buildAgencyComparisonRows } from "@/lib/monetization/agency-comparison.server";
import { getMonetizationSnapshot } from "@/lib/monetization/pricing-resolver.server";
import type { VenueTierId } from "@/lib/monetization/types";
import { effectiveAgencyPriceCents } from "@/lib/monetization/types";

export async function getAgencyPartnershipPlansDynamic(): Promise<AgencyPartnershipPlan[]> {
  const snapshot = await getMonetizationSnapshot();
  if (!snapshot.agencyPlans.length) return AGENCY_PARTNERSHIP_PLANS;

  const staticById = new Map(AGENCY_PARTNERSHIP_PLANS.map((p) => [p.id, p]));

  return snapshot.agencyPlans.map((dbPlan) => {
    const base = staticById.get(dbPlan.planId as AgencyPartnershipPlan["id"]);
    const priceCents = effectiveAgencyPriceCents(dbPlan);
    return {
      id: dbPlan.planId as AgencyPartnershipPlan["id"],
      name: dbPlan.name,
      tagline: dbPlan.tagline || base?.tagline || "",
      priceLabel: `$${(priceCents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}/month`,
      priceCents,
      popular: dbPlan.isPopular,
      artistLimit: dbPlan.artistLimit,
      staffLimit: dbPlan.staffLimit,
      promotionalCreditsCents: dbPlan.promotionalCreditsCents,
      promotionalCreditsLabel: `$${Math.round(dbPlan.promotionalCreditsCents / 100)}`,
      includedVenueTiers: dbPlan.includedVenueTiers as VenueTierId[],
      stadiumNote: dbPlan.planId === "enterprise" ? "Stadium bookings require approval" : undefined,
      features: dbPlan.features.length ? dbPlan.features : (base?.features ?? []),
      highlights: dbPlan.highlights.length ? dbPlan.highlights : (base?.highlights ?? []),
    };
  });
}

export async function getAgencyComparisonRowsDynamic() {
  const snapshot = await getMonetizationSnapshot();
  return buildAgencyComparisonRows(snapshot);
}

export async function getAgencyPlanByIdDynamic(planId: string) {
  const plans = await getAgencyPartnershipPlansDynamic();
  return plans.find((p) => p.id === planId) ?? plans[0]!;
}
