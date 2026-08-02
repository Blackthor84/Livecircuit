import { applyRuleActions, mergeRuleResults } from "@/lib/business-rules/apply-actions";
import { enrichContextWithTime, evaluateAllConditions } from "@/lib/business-rules/evaluate-conditions";
import {
  createInitialEngineState,
  type AppliedRule,
  type BusinessRule,
  type BusinessRuleHoliday,
  type BusinessRulesSnapshot,
  type IgnoredRule,
  type RuleEvaluationContext,
  type RuleEngineResult,
  type TargetAudience,
} from "@/lib/business-rules/types";

function isRuleActive(rule: BusinessRule, now: Date): boolean {
  if (rule.status !== "active") return false;
  if (rule.startsAt && now < new Date(rule.startsAt)) return false;
  if (rule.endsAt && now > new Date(rule.endsAt)) return false;
  return true;
}

function matchesAudience(rule: BusinessRule, ctx: RuleEvaluationContext): boolean {
  if (!rule.targetAudience.length) return true;
  if (!ctx.userType) return true;
  return rule.targetAudience.includes(ctx.userType as TargetAudience);
}

export function isHolidayDate(date: Date, holidays: BusinessRuleHoliday[], region?: string): boolean {
  const iso = date.toISOString().slice(0, 10);
  return holidays.some((h) => {
    if (!h.isActive) return false;
    if (h.regions.length && region && !h.regions.includes(region)) return false;
    return iso >= h.startsAt && iso <= h.endsAt;
  });
}

export function enrichContextWithHolidays(
  ctx: RuleEvaluationContext,
  holidays: BusinessRuleHoliday[]
): RuleEvaluationContext {
  const enriched = enrichContextWithTime(ctx);
  const now = enriched.now ?? new Date();
  const isHoliday = enriched.isHoliday ?? isHolidayDate(now, holidays, enriched.country);
  return { ...enriched, isHoliday };
}

export function evaluateBusinessRules(
  snapshot: BusinessRulesSnapshot,
  ctx: RuleEvaluationContext,
  options?: { category?: BusinessRule["category"] }
): RuleEngineResult {
  const enrichedCtx = enrichContextWithHolidays(ctx, snapshot.holidays);
  const now = enrichedCtx.now ?? new Date();

  const sorted = [...snapshot.rules]
    .filter((r) => !options?.category || r.category === options.category)
    .sort((a, b) => b.priority - a.priority);

  let state = createInitialEngineState();
  const appliedRules: AppliedRule[] = [];
  const ignoredRules: IgnoredRule[] = [];
  const conflicts: RuleEngineResult["conflicts"] = [];

  for (const rule of sorted) {
    if (!isRuleActive(rule, now)) {
      ignoredRules.push({ ruleId: rule.id, ruleName: rule.name, reason: `Status: ${rule.status}` });
      continue;
    }

    if (!matchesAudience(rule, enrichedCtx)) {
      ignoredRules.push({ ruleId: rule.id, ruleName: rule.name, reason: "Target audience mismatch" });
      continue;
    }

    if (!evaluateAllConditions(rule.conditions, enrichedCtx)) {
      ignoredRules.push({ ruleId: rule.id, ruleName: rule.name, reason: "Conditions not met" });
      continue;
    }

    const previousRuleName = appliedRules[0]?.ruleName;
    const ruleState = applyRuleActions(
      createInitialEngineState(),
      rule.actions,
      rule.name,
      conflicts,
      previousRuleName
    );

    state = mergeRuleResults(state, ruleState, appliedRules[0]?.ruleName ?? rule.name, rule.name, conflicts);

    appliedRules.push({
      ruleId: rule.id,
      ruleName: rule.name,
      priority: rule.priority,
      actions: rule.actions,
    });
  }

  return { state, appliedRules, ignoredRules, conflicts };
}

export function detectRuleConflicts(rules: BusinessRule[]): RuleEngineResult["conflicts"] {
  const conflicts: RuleEngineResult["conflicts"] = [];
  const active = rules.filter((r) => r.status === "active");

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i]!;
      const b = active[j]!;

      const aFree = a.actions.some((act) => act.type === "free_venue_booking");
      const bOverride = b.actions.some((act) => act.type === "venue_price_override");
      const bFree = b.actions.some((act) => act.type === "free_venue_booking");
      const aOverride = a.actions.some((act) => act.type === "venue_price_override");

      const sharedVenue = a.conditions.some(
        (ca) => ca.type === "venue_type" && b.conditions.some((cb) => cb.type === "venue_type" && cb.value === ca.value)
      );

      if (sharedVenue && ((aFree && bOverride) || (bFree && aOverride))) {
        conflicts.push({
          ruleA: a.name,
          ruleB: b.name,
          field: "venue_price",
          message: "Free booking and price override may conflict for the same venue type",
        });
      }

      const aManual = a.actions.some((act) => act.type === "require_manual_review");
      const bAuto = b.actions.some((act) => act.type === "auto_approve_event");
      const bManual = b.actions.some((act) => act.type === "require_manual_review");
      const aAuto = a.actions.some((act) => act.type === "auto_approve_event");

      if ((aManual && bAuto) || (bManual && aAuto)) {
        conflicts.push({
          ruleA: a.name,
          ruleB: b.name,
          field: "approval",
          message: "Manual review and auto-approve conflict",
        });
      }
    }
  }

  return conflicts;
}
