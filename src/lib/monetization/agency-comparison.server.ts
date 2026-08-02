import "server-only";

import type { AgencyComparisonRow } from "@/lib/monetization/extended-types";
import { formatCreditsLabel, formatPlanPrice } from "@/lib/monetization/extended-types";
import type { MonetizationSnapshot, VenueTierId } from "@/lib/monetization/types";
import { effectiveAgencyPriceCents } from "@/lib/monetization/types";

function tierIncluded(planTiers: VenueTierId[], tier: VenueTierId): string {
  return planTiers.includes(tier) ? "Included" : "—";
}

export function buildAgencyComparisonRows(snapshot: MonetizationSnapshot): AgencyComparisonRow[] {
  const plans = snapshot.agencyPlans;
  const boutique = plans.find((p) => p.planId === "boutique");
  const growth = plans.find((p) => p.planId === "growth");
  const enterprise = plans.find((p) => p.planId === "enterprise");

  if (!boutique || !growth || !enterprise) return [];

  const fmt = (p: typeof boutique) => `${formatPlanPrice(effectiveAgencyPriceCents(p))}/mo`;
  const credits = (planId: string) => {
    const c = snapshot.marketingCredits.find((m) => m.planId === planId);
    return c ? formatCreditsLabel(c.includedCreditsCents) : "—";
  };

  return [
    { label: "Monthly partnership", boutique: fmt(boutique), growth: fmt(growth), enterprise: fmt(enterprise) },
    {
      label: "Artists",
      boutique: boutique.artistLimit != null ? `Up to ${boutique.artistLimit}` : "Unlimited",
      growth: growth.artistLimit != null ? `Up to ${growth.artistLimit}` : "Unlimited",
      enterprise: enterprise.artistLimit != null ? `Up to ${enterprise.artistLimit}` : "Unlimited",
    },
    {
      label: "Staff",
      boutique: boutique.staffLimit != null ? String(boutique.staffLimit) : "Unlimited",
      growth: growth.staffLimit != null ? String(growth.staffLimit) : "Unlimited",
      enterprise: enterprise.staffLimit != null ? String(enterprise.staffLimit) : "Unlimited",
    },
    { label: "Community venues", boutique: tierIncluded(boutique.includedVenueTiers, "community"), growth: tierIncluded(growth.includedVenueTiers, "community"), enterprise: tierIncluded(enterprise.includedVenueTiers, "community") },
    { label: "Club venues", boutique: tierIncluded(boutique.includedVenueTiers, "club"), growth: tierIncluded(growth.includedVenueTiers, "club"), enterprise: tierIncluded(enterprise.includedVenueTiers, "club") },
    { label: "Theater venues", boutique: tierIncluded(boutique.includedVenueTiers, "theater"), growth: tierIncluded(growth.includedVenueTiers, "theater"), enterprise: tierIncluded(enterprise.includedVenueTiers, "theater") },
    { label: "Arena venues", boutique: tierIncluded(boutique.includedVenueTiers, "arena"), growth: tierIncluded(growth.includedVenueTiers, "arena"), enterprise: tierIncluded(enterprise.includedVenueTiers, "arena") },
    { label: "Stadium venues", boutique: "—", growth: "—", enterprise: "By approval" },
    { label: "Promotional credits", boutique: credits("boutique"), growth: credits("growth"), enterprise: credits("enterprise") },
    { label: "Booking CRM", boutique: "✓", growth: "✓", enterprise: "✓" },
    { label: "Sponsor marketplace", boutique: boutique.featureToggles.sponsor_marketplace ? "✓" : "—", growth: growth.featureToggles.sponsor_marketplace ? "✓" : "✓", enterprise: "✓" },
    { label: "Advanced AI marketing", boutique: boutique.supportLevel === "standard" ? "Basic" : "Advanced", growth: "Advanced", enterprise: "Advanced" },
    { label: "White-label portal", boutique: "—", growth: "Ticket pages", enterprise: "Full portal" },
    { label: "API access", boutique: boutique.featureToggles.api_access ? "✓" : "—", growth: "✓", enterprise: "✓" },
    { label: "Account manager", boutique: "—", growth: "Success manager", enterprise: "Dedicated" },
    { label: "Prime-time priority", boutique: "✓", growth: "✓", enterprise: "✓" },
  ];
}

export function buildAgencySubscriptionHighlight(snapshot: MonetizationSnapshot) {
  return snapshot.agencyPlans.map((p) => ({
    name: p.name,
    price: `${formatPlanPrice(effectiveAgencyPriceCents(p))}/mo`,
  }));
}
