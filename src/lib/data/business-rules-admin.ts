import "server-only";

import { detectRuleConflicts } from "@/lib/business-rules/engine";
import {
  getBusinessRulesSnapshot,
  listBusinessRuleHistory,
  type BusinessRuleHistoryRow,
} from "@/lib/business-rules/rules-resolver.server";
import type { BusinessRule, BusinessRuleCategory } from "@/lib/business-rules/types";

export async function getBusinessRulesAdminSnapshot() {
  return getBusinessRulesSnapshot();
}

export async function listRulesByCategory(category?: BusinessRuleCategory): Promise<BusinessRule[]> {
  const snapshot = await getBusinessRulesSnapshot();
  if (!category) return snapshot.rules;
  return snapshot.rules.filter((r) => r.category === category);
}

export async function getBusinessRulesOverview() {
  const snapshot = await getBusinessRulesSnapshot();
  const active = snapshot.rules.filter((r) => r.status === "active").length;
  const draft = snapshot.rules.filter((r) => r.status === "draft").length;
  const conflicts = detectRuleConflicts(snapshot.rules);

  const byCategory = snapshot.rules.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + 1;
    return acc;
  }, {});

  return {
    totalRules: snapshot.rules.length,
    activeRules: active,
    draftRules: draft,
    holidayCount: snapshot.holidays.filter((h) => h.isActive).length,
    conflicts,
    byCategory,
    rules: snapshot.rules,
    holidays: snapshot.holidays,
  };
}

export async function getBusinessRuleHistory(limit = 50): Promise<BusinessRuleHistoryRow[]> {
  return listBusinessRuleHistory(limit);
}

export { detectRuleConflicts };
