import "server-only";

import type { MonetizationSnapshot } from "@/lib/monetization/types";
import { detectRuleConflicts } from "@/lib/business-rules/engine";
import type { BusinessRule } from "@/lib/business-rules/types";

export type PricingValidationIssue = {
  severity: "error" | "warning";
  code: string;
  message: string;
  entityKey?: string;
};

export function validatePricingSnapshot(
  snapshot: MonetizationSnapshot,
  rules: BusinessRule[] = []
): PricingValidationIssue[] {
  const issues: PricingValidationIssue[] = [];

  const planIds = new Set<string>();
  for (const plan of snapshot.agencyPlans) {
    if (planIds.has(plan.planId)) {
      issues.push({
        severity: "error",
        code: "duplicate_plan",
        message: `Duplicate agency plan: ${plan.planId}`,
        entityKey: plan.planId,
      });
    }
    planIds.add(plan.planId);

    if (plan.priceCents < 0) {
      issues.push({
        severity: "error",
        code: "invalid_price",
        message: `Invalid price for plan ${plan.planId}`,
        entityKey: plan.planId,
      });
    }

    if (plan.annualDiscountPercent > 100 || plan.monthlyDiscountPercent > 100) {
      issues.push({
        severity: "error",
        code: "invalid_discount",
        message: `Discount exceeds 100% for plan ${plan.planId}`,
        entityKey: plan.planId,
      });
    }
  }

  const venueIds = new Set<string>();
  for (const venue of snapshot.venues) {
    if (venueIds.has(venue.tierId)) {
      issues.push({
        severity: "error",
        code: "duplicate_venue",
        message: `Duplicate venue tier: ${venue.tierId}`,
        entityKey: venue.tierId,
      });
    }
    venueIds.add(venue.tierId);

    if (venue.bookingFeeCents < 0) {
      issues.push({
        severity: "error",
        code: "invalid_fee",
        message: `Invalid booking fee for ${venue.tierId}`,
        entityKey: venue.tierId,
      });
    }
  }

  if (snapshot.tickets.platformFeePercent < 0 || snapshot.tickets.platformFeePercent > 100) {
    issues.push({
      severity: "error",
      code: "invalid_platform_fee",
      message: "Platform fee percent must be between 0 and 100",
      entityKey: "ticket_config",
    });
  }

  if (!snapshot.agencyPlans.length) {
    issues.push({
      severity: "warning",
      code: "missing_agency_plans",
      message: "No agency plans configured",
    });
  }

  if (!snapshot.venues.length) {
    issues.push({
      severity: "warning",
      code: "missing_venue_pricing",
      message: "No venue pricing tiers configured",
    });
  }

  for (const conflict of detectRuleConflicts(rules)) {
    issues.push({
      severity: "warning",
      code: "rule_conflict",
      message: conflict.message,
      entityKey: `${conflict.ruleA}/${conflict.ruleB}`,
    });
  }

  return issues;
}

export function hasBlockingValidationErrors(issues: PricingValidationIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}
