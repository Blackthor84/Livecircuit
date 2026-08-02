import type { RuleCondition, RuleEvaluationContext } from "@/lib/business-rules/types";

function normalizeDay(day: string): string {
  return day.toLowerCase().slice(0, 3);
}

const dayNames: Record<number, string> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

function compareValues(
  operator: RuleCondition["operator"],
  actual: string | number | boolean | undefined,
  expected: RuleCondition["value"]
): boolean {
  if (actual === undefined || actual === null) return false;

  switch (operator) {
    case "equals":
      return String(actual).toLowerCase() === String(expected).toLowerCase();
    case "not_equals":
      return String(actual).toLowerCase() !== String(expected).toLowerCase();
    case "in": {
      const list = Array.isArray(expected) ? expected : [expected];
      return list.map(String).some((v) => v.toLowerCase() === String(actual).toLowerCase());
    }
    case "not_in": {
      const list = Array.isArray(expected) ? expected : [expected];
      return !list.map(String).some((v) => v.toLowerCase() === String(actual).toLowerCase());
    }
    case "gte":
      return Number(actual) >= Number(expected);
    case "lte":
      return Number(actual) <= Number(expected);
    case "gt":
      return Number(actual) > Number(expected);
    case "lt":
      return Number(actual) < Number(expected);
    case "contains": {
      if (Array.isArray(actual)) {
        return actual.map(String).some((v) => v.toLowerCase() === String(expected).toLowerCase());
      }
      return String(actual).toLowerCase().includes(String(expected).toLowerCase());
    }
    case "between": {
      if (!Array.isArray(expected) || expected.length < 2) return false;
      const n = Number(actual);
      return n >= Number(expected[0]) && n <= Number(expected[1]);
    }
    default:
      return false;
  }
}

function getContextValue(ctx: RuleEvaluationContext, type: RuleCondition["type"]): string | number | boolean | string[] | undefined {
  const now = ctx.now ?? new Date();
  const dayIndex = now.getDay();

  switch (type) {
    case "user_type":
      return ctx.userType;
    case "agency_plan":
      return ctx.agencyPlan;
    case "venue_type":
      return ctx.venueType;
    case "artist_status":
      return ctx.artistStatus;
    case "genre":
      return ctx.genre;
    case "country":
      return ctx.country;
    case "state":
      return ctx.state;
    case "location":
      return ctx.state ?? ctx.country;
    case "time":
      return ctx.hour ?? now.getHours();
    case "day_of_week":
      return ctx.dayOfWeek ?? dayNames[dayIndex];
    case "holiday":
      return ctx.isHoliday ?? false;
    case "revenue":
      return ctx.revenueCents;
    case "ticket_sales":
      return ctx.ticketSales;
    case "attendance":
      return ctx.attendance;
    case "fan_count":
      return ctx.fanCount;
    case "sponsor_count":
      return ctx.sponsorCount;
    case "event_count":
      return ctx.eventCount ?? ctx.bookingCount;
    case "referral_source":
      return ctx.referralSource;
    case "coupon_used":
      return ctx.couponCode;
    case "custom_tags":
      return ctx.customTags;
    default:
      return undefined;
  }
}

export function evaluateCondition(condition: RuleCondition, ctx: RuleEvaluationContext): boolean {
  const actual = getContextValue(ctx, condition.type);

  if (condition.type === "artist_status" && Array.isArray(actual)) {
    const expected = String(condition.value).toLowerCase();
    if (condition.operator === "equals") {
      return actual.some((s) => s.toLowerCase() === expected);
    }
    if (condition.operator === "in") {
      const list = Array.isArray(condition.value) ? condition.value.map(String) : [String(condition.value)];
      return actual.some((s) => list.some((v) => v.toLowerCase() === s.toLowerCase()));
    }
  }

  if (condition.type === "custom_tags" && Array.isArray(actual)) {
    return compareValues(condition.operator, actual.join(","), condition.value) ||
      actual.some((tag) => compareValues(condition.operator, tag, condition.value));
  }

  if (condition.type === "day_of_week") {
    const day = String(actual ?? "").toLowerCase();
    const expected = condition.value;
    if (condition.operator === "in" && Array.isArray(expected)) {
      return expected.some((d) => normalizeDay(String(d)) === normalizeDay(day) || String(d).toLowerCase() === day);
    }
    return compareValues(condition.operator, day, expected);
  }

  return compareValues(condition.operator, actual as string | number | boolean, condition.value);
}

export function evaluateAllConditions(conditions: RuleCondition[], ctx: RuleEvaluationContext): boolean {
  if (!conditions.length) return true;
  return conditions.every((c) => evaluateCondition(c, ctx));
}

export function enrichContextWithTime(ctx: RuleEvaluationContext): RuleEvaluationContext {
  const now = ctx.now ?? new Date();
  const dayIndex = now.getDay();
  const dayName = dayNames[dayIndex];
  const isWeekend = dayIndex === 0 || dayIndex === 6;

  return {
    ...ctx,
    now,
    dayOfWeek: ctx.dayOfWeek ?? dayName,
    isWeekend: ctx.isWeekend ?? isWeekend,
    hour: ctx.hour ?? now.getHours(),
  };
}
