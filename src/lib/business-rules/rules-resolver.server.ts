import "server-only";

import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  BusinessRule,
  BusinessRuleCategory,
  BusinessRuleHoliday,
  BusinessRuleStatus,
  BusinessRulesSnapshot,
  RuleAction,
  RuleCondition,
  TargetAudience,
} from "@/lib/business-rules/types";

const CACHE_TAG = "business-rules";

function mapRule(row: Record<string, unknown>): BusinessRule {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? "",
    category: row.category as BusinessRuleCategory,
    priority: Number(row.priority ?? 100),
    status: row.status as BusinessRuleStatus,
    startsAt: (row.starts_at as string) ?? null,
    endsAt: (row.ends_at as string) ?? null,
    targetAudience: Array.isArray(row.target_audience) ? (row.target_audience as TargetAudience[]) : [],
    conditions: Array.isArray(row.conditions) ? (row.conditions as RuleCondition[]) : [],
    actions: Array.isArray(row.actions) ? (row.actions as RuleAction[]) : [],
    adminNotes: (row.admin_notes as string) ?? null,
    version: Number(row.version ?? 1),
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

function mapHoliday(row: Record<string, unknown>): BusinessRuleHoliday {
  return {
    id: row.id as string,
    name: row.name as string,
    startsAt: row.starts_at as string,
    endsAt: row.ends_at as string,
    regions: Array.isArray(row.regions) ? (row.regions as string[]) : [],
    surchargePercent: Number(row.surcharge_percent ?? 0),
    isActive: Boolean(row.is_active),
  };
}

async function loadBusinessRulesUncached(): Promise<BusinessRulesSnapshot> {
  try {
    const supabase = await createClient();
    const [rulesRes, holidaysRes] = await Promise.all([
      supabase.from("business_rules").select("*").order("priority", { ascending: false }),
      supabase.from("business_rules_holidays").select("*").order("starts_at"),
    ]);

    return {
      rules: (rulesRes.data ?? []).map((r) => mapRule(r as Record<string, unknown>)),
      holidays: (holidaysRes.data ?? []).map((r) => mapHoliday(r as Record<string, unknown>)),
      loadedAt: new Date().toISOString(),
    };
  } catch {
    return { rules: [], holidays: [], loadedAt: new Date().toISOString() };
  }
}

export const getBusinessRulesSnapshot = unstable_cache(
  loadBusinessRulesUncached,
  [CACHE_TAG],
  { revalidate: 60, tags: [CACHE_TAG] }
);

export const BUSINESS_RULES_CACHE_TAG = CACHE_TAG;

export async function getBusinessRuleById(id: string): Promise<BusinessRule | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("business_rules").select("*").eq("id", id).maybeSingle();
  return data ? mapRule(data as Record<string, unknown>) : null;
}

export type BusinessRuleHistoryRow = {
  id: string;
  ruleId: string | null;
  previousRule: BusinessRule | null;
  updatedRule: BusinessRule;
  reason: string | null;
  changedBy: string | null;
  changedAt: string;
  rolledBack: boolean;
  adminName?: string | null;
};

export async function listBusinessRuleHistory(limit = 50): Promise<BusinessRuleHistoryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("business_rules_history")
    .select("*")
    .order("changed_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    ruleId: (row.rule_id as string) ?? null,
    previousRule: row.previous_rule ? mapRule(row.previous_rule as Record<string, unknown>) : null,
    updatedRule: mapRule(row.updated_rule as Record<string, unknown>),
    reason: (row.reason as string) ?? null,
    changedBy: (row.changed_by as string) ?? null,
    changedAt: row.changed_at as string,
    rolledBack: Boolean(row.rolled_back),
  }));
}
