import type { MonetizationVisibility } from "@/lib/monetization/types";
import type { VenueTierId } from "@/lib/monetization/types";

export const BUSINESS_RULE_CATEGORIES = [
  "venue",
  "pricing",
  "subscription",
  "agency",
  "artist",
  "sponsor",
  "discount",
  "promotion",
  "ticket",
  "feature_access",
  "automation",
  "holiday",
  "regional",
  "experimental",
] as const;

export type BusinessRuleCategory = (typeof BUSINESS_RULE_CATEGORIES)[number];

export const BUSINESS_RULE_STATUSES = ["active", "inactive", "draft", "archived"] as const;
export type BusinessRuleStatus = (typeof BUSINESS_RULE_STATUSES)[number];

export const TARGET_AUDIENCES = ["artist", "agency", "sponsor", "admin", "fan"] as const;
export type TargetAudience = (typeof TARGET_AUDIENCES)[number];

export const CONDITION_TYPES = [
  "user_type",
  "agency_plan",
  "venue_type",
  "artist_status",
  "genre",
  "location",
  "country",
  "state",
  "time",
  "day_of_week",
  "holiday",
  "revenue",
  "ticket_sales",
  "attendance",
  "fan_count",
  "sponsor_count",
  "event_count",
  "referral_source",
  "coupon_used",
  "custom_tags",
] as const;

export type ConditionType = (typeof CONDITION_TYPES)[number];

export const ACTION_TYPES = [
  "free_venue_booking",
  "venue_discount",
  "venue_surcharge",
  "venue_price_override",
  "ticket_fee_override",
  "promotion_credits",
  "homepage_feature",
  "early_booking_access",
  "priority_scheduling",
  "feature_unlock",
  "feature_lock",
  "increase_ticket_limit",
  "reduce_ticket_limit",
  "enable_beta_features",
  "grant_verification",
  "auto_approve_event",
  "require_manual_review",
  "disable_booking",
  "hide_feature",
  "show_banner",
  "award_credits",
  "apply_coupon",
  "assign_badge",
  "apply_weekend_multiplier",
  "apply_holiday_multiplier",
  "apply_peak_hour_multiplier",
  "set_feature_visibility",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "in"
  | "not_in"
  | "gte"
  | "lte"
  | "gt"
  | "lt"
  | "contains"
  | "between";

export type RuleCondition = {
  type: ConditionType;
  operator: ConditionOperator;
  value: string | number | boolean | string[] | number[];
};

export type RuleAction = {
  type: ActionType;
  value?: string | number | boolean;
  unit?: "percent" | "cents" | "dollars" | "multiplier";
  feature?: string;
  visibility?: MonetizationVisibility;
};

export type BusinessRule = {
  id: string;
  name: string;
  description: string;
  category: BusinessRuleCategory;
  priority: number;
  status: BusinessRuleStatus;
  startsAt: string | null;
  endsAt: string | null;
  targetAudience: TargetAudience[];
  conditions: RuleCondition[];
  actions: RuleAction[];
  adminNotes: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type BusinessRuleHoliday = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  regions: string[];
  surchargePercent: number;
  isActive: boolean;
};

export type BusinessRulesSnapshot = {
  rules: BusinessRule[];
  holidays: BusinessRuleHoliday[];
  loadedAt: string;
};

export type UserType = "artist" | "agency" | "sponsor" | "admin" | "fan";
export type AgencyPlanId = "boutique" | "growth" | "enterprise";
export type ArtistStatus = "verified" | "unverified" | "new" | "top_performer";

/** Context passed to the rules engine for evaluation. */
export type RuleEvaluationContext = {
  now?: Date;
  userType?: UserType;
  agencyPlan?: AgencyPlanId;
  venueType?: VenueTierId;
  artistStatus?: ArtistStatus[];
  genre?: string;
  country?: string;
  state?: string;
  isHoliday?: boolean;
  isWeekend?: boolean;
  dayOfWeek?: string;
  hour?: number;
  revenueCents?: number;
  ticketSales?: number;
  attendance?: number;
  fanCount?: number;
  sponsorCount?: number;
  eventCount?: number;
  referralSource?: string;
  couponCode?: string;
  customTags?: string[];
  isBetaUser?: boolean;
  bookingCount?: number;
  daysUntilEvent?: number;
  viewerRole?: string;
};

export type AppliedRule = {
  ruleId: string;
  ruleName: string;
  priority: number;
  actions: RuleAction[];
};

export type IgnoredRule = {
  ruleId: string;
  ruleName: string;
  reason: string;
};

export type RuleConflict = {
  ruleA: string;
  ruleB: string;
  field: string;
  message: string;
};

export type RuleEngineState = {
  freeBooking: boolean;
  venueDiscountPercent: number;
  venueSurchargePercent: number;
  venuePriceOverrideCents: number | null;
  ticketFeePercentOverride: number | null;
  ticketFeeFlatOverrideCents: number | null;
  promotionCreditsCents: number;
  creditsToAwardCents: number;
  featuresUnlocked: Set<string>;
  featuresLocked: Set<string>;
  featureVisibility: Map<string, MonetizationVisibility>;
  requiresManualReview: boolean;
  autoApprove: boolean;
  bookingDisabled: boolean;
  earlyBookingAccess: boolean;
  priorityScheduling: boolean;
  homepageFeature: boolean;
  ticketLimitMultiplier: number;
  bannerMessage: string | null;
  badgeAward: string | null;
  couponToApply: string | null;
  applyWeekendMultiplier: boolean;
  applyHolidayMultiplier: boolean;
  applyPeakHourMultiplier: boolean;
  enableBetaFeatures: boolean;
  grantVerification: boolean;
};

export type RuleEngineResult = {
  state: RuleEngineState;
  appliedRules: AppliedRule[];
  ignoredRules: IgnoredRule[];
  conflicts: RuleConflict[];
};

export const CATEGORY_LABELS: Record<BusinessRuleCategory, string> = {
  venue: "Venue Rules",
  pricing: "Pricing Rules",
  subscription: "Subscription Rules",
  agency: "Agency Rules",
  artist: "Artist Rules",
  sponsor: "Sponsor Rules",
  discount: "Discount Rules",
  promotion: "Promotion Rules",
  ticket: "Ticket Rules",
  feature_access: "Feature Access Rules",
  automation: "Automation Rules",
  holiday: "Holiday Rules",
  regional: "Regional Rules",
  experimental: "Experimental Rules",
};

export const CONDITION_LABELS: Record<ConditionType, string> = {
  user_type: "User Type",
  agency_plan: "Agency Plan",
  venue_type: "Venue Type",
  artist_status: "Artist Status",
  genre: "Genre",
  location: "Location",
  country: "Country",
  state: "State",
  time: "Time",
  day_of_week: "Day Of Week",
  holiday: "Holiday",
  revenue: "Revenue",
  ticket_sales: "Ticket Sales",
  attendance: "Attendance",
  fan_count: "Fan Count",
  sponsor_count: "Sponsor Count",
  event_count: "Event Count",
  referral_source: "Referral Source",
  coupon_used: "Coupon Used",
  custom_tags: "Custom Tags",
};

export const ACTION_LABELS: Record<ActionType, string> = {
  free_venue_booking: "Free Venue Booking",
  venue_discount: "Venue Discount",
  venue_surcharge: "Venue Surcharge",
  venue_price_override: "Venue Price Override",
  ticket_fee_override: "Ticket Fee Override",
  promotion_credits: "Promotion Credits",
  homepage_feature: "Homepage Feature",
  early_booking_access: "Early Booking Access",
  priority_scheduling: "Priority Scheduling",
  feature_unlock: "Feature Unlock",
  feature_lock: "Feature Lock",
  increase_ticket_limit: "Increase Ticket Limit",
  reduce_ticket_limit: "Reduce Ticket Limit",
  enable_beta_features: "Enable Beta Features",
  grant_verification: "Grant Verification",
  auto_approve_event: "Auto Approve Event",
  require_manual_review: "Require Manual Review",
  disable_booking: "Disable Booking",
  hide_feature: "Hide Feature",
  show_banner: "Show Banner",
  award_credits: "Award Credits",
  apply_coupon: "Apply Coupon",
  assign_badge: "Assign Badge",
  apply_weekend_multiplier: "Apply Weekend Multiplier",
  apply_holiday_multiplier: "Apply Holiday Multiplier",
  apply_peak_hour_multiplier: "Apply Peak Hour Multiplier",
  set_feature_visibility: "Set Feature Visibility",
};

export function createInitialEngineState(): RuleEngineState {
  return {
    freeBooking: false,
    venueDiscountPercent: 0,
    venueSurchargePercent: 0,
    venuePriceOverrideCents: null,
    ticketFeePercentOverride: null,
    ticketFeeFlatOverrideCents: null,
    promotionCreditsCents: 0,
    creditsToAwardCents: 0,
    featuresUnlocked: new Set(),
    featuresLocked: new Set(),
    featureVisibility: new Map(),
    requiresManualReview: false,
    autoApprove: false,
    bookingDisabled: false,
    earlyBookingAccess: false,
    priorityScheduling: false,
    homepageFeature: false,
    ticketLimitMultiplier: 1,
    bannerMessage: null,
    badgeAward: null,
    couponToApply: null,
    applyWeekendMultiplier: false,
    applyHolidayMultiplier: false,
    applyPeakHourMultiplier: false,
    enableBetaFeatures: false,
    grantVerification: false,
  };
}

export function serializeEngineState(state: RuleEngineState) {
  return {
    freeBooking: state.freeBooking,
    venueDiscountPercent: state.venueDiscountPercent,
    venueSurchargePercent: state.venueSurchargePercent,
    venuePriceOverrideCents: state.venuePriceOverrideCents,
    ticketFeePercentOverride: state.ticketFeePercentOverride,
    ticketFeeFlatOverrideCents: state.ticketFeeFlatOverrideCents,
    promotionCreditsCents: state.promotionCreditsCents,
    creditsToAwardCents: state.creditsToAwardCents,
    featuresUnlocked: [...state.featuresUnlocked],
    featuresLocked: [...state.featuresLocked],
    featureVisibility: Object.fromEntries(state.featureVisibility),
    requiresManualReview: state.requiresManualReview,
    autoApprove: state.autoApprove,
    bookingDisabled: state.bookingDisabled,
    earlyBookingAccess: state.earlyBookingAccess,
    priorityScheduling: state.priorityScheduling,
    homepageFeature: state.homepageFeature,
    ticketLimitMultiplier: state.ticketLimitMultiplier,
    bannerMessage: state.bannerMessage,
    badgeAward: state.badgeAward,
    couponToApply: state.couponToApply,
    applyWeekendMultiplier: state.applyWeekendMultiplier,
    applyHolidayMultiplier: state.applyHolidayMultiplier,
    applyPeakHourMultiplier: state.applyPeakHourMultiplier,
    enableBetaFeatures: state.enableBetaFeatures,
    grantVerification: state.grantVerification,
  };
}
