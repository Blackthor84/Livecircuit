import { evaluateBusinessRules } from "@/lib/business-rules/engine";
import type { BusinessRulesSnapshot, RuleEvaluationContext } from "@/lib/business-rules/types";
import type { MonetizationSnapshot, VenueTierId } from "@/lib/monetization/types";
import { effectiveVenueFeeCents } from "@/lib/monetization/types";

export function resolveVenuePriceSync(
  monetization: MonetizationSnapshot,
  rules: BusinessRulesSnapshot,
  ctx: RuleEvaluationContext & { venueType: VenueTierId }
): {
  feeCents: number;
  isFree: boolean;
  appliedRuleNames: string[];
} {
  const evaluation = evaluateBusinessRules(rules, ctx);
  const { state } = evaluation;
  const now = ctx.now ?? new Date();
  const tier = monetization.venues.find((v) => v.tierId === ctx.venueType);

  if (state.freeBooking || state.venuePriceOverrideCents === 0) {
    return {
      feeCents: 0,
      isFree: true,
      appliedRuleNames: evaluation.appliedRules.map((r) => r.ruleName),
    };
  }

  let baseCents =
    state.venuePriceOverrideCents ??
    (tier ? effectiveVenueFeeCents(tier, now) ?? tier.bookingFeeCents : 0);

  if (state.applyWeekendMultiplier && ctx.isWeekend && tier) {
    baseCents = Math.round(baseCents * tier.weekendMultiplier);
  }
  if (state.applyHolidayMultiplier && ctx.isHoliday && tier) {
    baseCents = Math.round(baseCents * tier.holidayMultiplier);
  }

  let finalCents = baseCents;

  if (state.venueDiscountPercent > 0) {
    finalCents -= Math.round(finalCents * (state.venueDiscountPercent / 100));
  }
  if (state.venueSurchargePercent > 0) {
    finalCents += Math.round(finalCents * (state.venueSurchargePercent / 100));
  }

  if (tier?.minBookingFeeCents != null) finalCents = Math.max(finalCents, tier.minBookingFeeCents);
  if (tier?.maxBookingFeeCents != null) finalCents = Math.min(finalCents, tier.maxBookingFeeCents);

  return {
    feeCents: finalCents,
    isFree: finalCents === 0,
    appliedRuleNames: evaluation.appliedRules.map((r) => r.ruleName),
  };
}
