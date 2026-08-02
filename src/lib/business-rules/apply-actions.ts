import type { RuleAction, RuleConflict, RuleEngineState } from "@/lib/business-rules/types";

function detectConflict(
  conflicts: RuleConflict[],
  ruleName: string,
  otherRuleName: string,
  field: string,
  message: string
) {
  conflicts.push({ ruleA: ruleName, ruleB: otherRuleName, field, message });
}

export function applyRuleActions(
  state: RuleEngineState,
  actions: RuleAction[],
  ruleName: string,
  conflicts: RuleConflict[],
  otherRuleName?: string
): RuleEngineState {
  const next = { ...state };
  next.featuresUnlocked = new Set(state.featuresUnlocked);
  next.featuresLocked = new Set(state.featuresLocked);
  next.featureVisibility = new Map(state.featureVisibility);

  for (const action of actions) {
    switch (action.type) {
      case "free_venue_booking":
        if (next.venuePriceOverrideCents != null && next.venuePriceOverrideCents > 0 && otherRuleName) {
          detectConflict(conflicts, ruleName, otherRuleName, "venue_price", "Free booking conflicts with price override");
        }
        next.freeBooking = true;
        next.venuePriceOverrideCents = 0;
        break;

      case "venue_discount":
        next.venueDiscountPercent = Math.max(next.venueDiscountPercent, Number(action.value ?? 0));
        break;

      case "venue_surcharge":
        next.venueSurchargePercent = Math.max(next.venueSurchargePercent, Number(action.value ?? 0));
        break;

      case "venue_price_override": {
        const cents =
          action.unit === "dollars"
            ? Math.round(Number(action.value ?? 0) * 100)
            : Number(action.value ?? 0);
        if (next.freeBooking && cents > 0 && otherRuleName) {
          detectConflict(conflicts, ruleName, otherRuleName, "venue_price", "Price override conflicts with free booking");
        }
        next.venuePriceOverrideCents = cents;
        if (cents === 0) next.freeBooking = true;
        break;
      }

      case "ticket_fee_override":
        if (action.unit === "percent") {
          next.ticketFeePercentOverride = Number(action.value ?? 0);
        } else {
          next.ticketFeeFlatOverrideCents = Number(action.value ?? 0);
        }
        break;

      case "promotion_credits":
        next.promotionCreditsCents += Number(action.value ?? 0);
        break;

      case "award_credits":
        next.creditsToAwardCents += Number(action.value ?? 0);
        break;

      case "homepage_feature":
        next.homepageFeature = true;
        break;

      case "early_booking_access":
        next.earlyBookingAccess = true;
        break;

      case "priority_scheduling":
        next.priorityScheduling = true;
        break;

      case "feature_unlock":
        if (action.feature) next.featuresUnlocked.add(action.feature);
        if (typeof action.value === "string") next.featuresUnlocked.add(action.value);
        break;

      case "feature_lock":
        if (action.feature) next.featuresLocked.add(action.feature);
        if (typeof action.value === "string") next.featuresLocked.add(action.value);
        break;

      case "increase_ticket_limit":
        next.ticketLimitMultiplier *= 1 + Number(action.value ?? 0.25);
        break;

      case "reduce_ticket_limit":
        next.ticketLimitMultiplier *= 1 - Number(action.value ?? 0.25);
        break;

      case "enable_beta_features":
        next.enableBetaFeatures = true;
        next.featuresUnlocked.add("beta_labs");
        break;

      case "grant_verification":
        next.grantVerification = true;
        break;

      case "auto_approve_event":
        if (next.requiresManualReview && otherRuleName) {
          detectConflict(conflicts, ruleName, otherRuleName, "approval", "Auto-approve conflicts with manual review");
        }
        next.autoApprove = true;
        break;

      case "require_manual_review":
        if (next.autoApprove && otherRuleName) {
          detectConflict(conflicts, ruleName, otherRuleName, "approval", "Manual review conflicts with auto-approve");
        }
        next.requiresManualReview = true;
        break;

      case "disable_booking":
        next.bookingDisabled = true;
        break;

      case "hide_feature":
        if (action.feature) next.featureVisibility.set(action.feature, "hidden");
        break;

      case "show_banner":
        next.bannerMessage = String(action.value ?? "Special offer available");
        break;

      case "apply_coupon":
        next.couponToApply = String(action.value ?? "");
        break;

      case "assign_badge":
        next.badgeAward = String(action.value ?? "featured");
        break;

      case "apply_weekend_multiplier":
        next.applyWeekendMultiplier = true;
        break;

      case "apply_holiday_multiplier":
        next.applyHolidayMultiplier = true;
        break;

      case "apply_peak_hour_multiplier":
        next.applyPeakHourMultiplier = true;
        break;

      case "set_feature_visibility":
        if (action.feature && action.visibility) {
          next.featureVisibility.set(action.feature, action.visibility);
        }
        break;

      default:
        break;
    }
  }

  return next;
}

export function mergeRuleResults(
  current: RuleEngineState,
  incoming: RuleEngineState,
  currentRuleName: string,
  incomingRuleName: string,
  conflicts: RuleConflict[]
): RuleEngineState {
  const merged = { ...incoming };
  merged.featuresUnlocked = new Set([...current.featuresUnlocked, ...incoming.featuresUnlocked]);
  merged.featuresLocked = new Set([...current.featuresLocked, ...incoming.featuresLocked]);
  merged.featureVisibility = new Map([...current.featureVisibility, ...incoming.featureVisibility]);

  // Highest priority wins for override fields
  if (current.venuePriceOverrideCents != null && incoming.venuePriceOverrideCents != null &&
      current.venuePriceOverrideCents !== incoming.venuePriceOverrideCents) {
    detectConflict(conflicts, currentRuleName, incomingRuleName, "venue_price", "Competing venue price overrides");
  }

  merged.venueDiscountPercent = Math.max(current.venueDiscountPercent, incoming.venueDiscountPercent);
  merged.venueSurchargePercent = Math.max(current.venueSurchargePercent, incoming.venueSurchargePercent);
  merged.promotionCreditsCents = current.promotionCreditsCents + incoming.promotionCreditsCents;
  merged.creditsToAwardCents = current.creditsToAwardCents + incoming.creditsToAwardCents;

  merged.freeBooking = incoming.freeBooking || current.freeBooking;
  merged.venuePriceOverrideCents =
    incoming.venuePriceOverrideCents ?? current.venuePriceOverrideCents;
  merged.ticketFeePercentOverride =
    incoming.ticketFeePercentOverride ?? current.ticketFeePercentOverride;
  merged.ticketFeeFlatOverrideCents =
    incoming.ticketFeeFlatOverrideCents ?? current.ticketFeeFlatOverrideCents;

  merged.requiresManualReview = incoming.requiresManualReview || current.requiresManualReview;
  merged.autoApprove = incoming.autoApprove || current.autoApprove;
  merged.bookingDisabled = incoming.bookingDisabled || current.bookingDisabled;
  merged.enableBetaFeatures = incoming.enableBetaFeatures || current.enableBetaFeatures;

  return merged;
}
