"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import {
  BUSINESS_RULES_CACHE_TAG,
  getBusinessRuleById,
} from "@/lib/business-rules/rules-resolver.server";
import {
  BUSINESS_RULE_CATEGORIES,
  BUSINESS_RULE_STATUSES,
  CONDITION_TYPES,
  ACTION_TYPES,
  TARGET_AUDIENCES,
  type BusinessRule,
} from "@/lib/business-rules/types";
import { createClient } from "@/lib/supabase/server";

export type BusinessRulesActionResult = { ok: true; id?: string } | { ok: false; error: string };

const BUSINESS_RULES_PATHS = [
  "/admin/business-rules",
  "/admin/business-rules/venue",
  "/admin/business-rules/pricing",
  "/admin/business-rules/subscription",
  "/admin/business-rules/agency",
  "/admin/business-rules/artist",
  "/admin/business-rules/sponsor",
  "/admin/business-rules/discount",
  "/admin/business-rules/promotion",
  "/admin/business-rules/ticket",
  "/admin/business-rules/feature-access",
  "/admin/business-rules/automation",
  "/admin/business-rules/holiday",
  "/admin/business-rules/regional",
  "/admin/business-rules/experimental",
  "/admin/business-rules/simulate",
  "/admin/business-rules/history",
  "/",
  "/creator-promise",
  "/agency/pricing",
  "/artists/success-center",
];

function revalidateAll() {
  revalidateTag(BUSINESS_RULES_CACHE_TAG, "max");
  revalidateTag("monetization-pricing", "max");
  for (const p of BUSINESS_RULES_PATHS) revalidatePath(p);
}

const conditionSchema = z.object({
  type: z.enum(CONDITION_TYPES),
  operator: z.enum(["equals", "not_equals", "in", "not_in", "gte", "lte", "gt", "lt", "contains", "between"]),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))]),
});

const actionSchema = z.object({
  type: z.enum(ACTION_TYPES),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  unit: z.enum(["percent", "cents", "dollars", "multiplier"]).optional(),
  feature: z.string().optional(),
  visibility: z.string().optional(),
});

const ruleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(BUSINESS_RULE_CATEGORIES),
  priority: z.number().int().min(0).max(9999),
  status: z.enum(BUSINESS_RULE_STATUSES),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  targetAudience: z.array(z.enum(TARGET_AUDIENCES)).optional(),
  conditions: z.array(conditionSchema),
  actions: z.array(actionSchema).min(1),
  adminNotes: z.string().optional(),
  reason: z.string().optional(),
});

async function logRuleHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    ruleId: string | null;
    previousRule: BusinessRule | null;
    updatedRule: BusinessRule;
    reason?: string;
    userId?: string;
  }
) {
  await supabase.from("business_rules_history").insert({
    rule_id: input.ruleId,
    previous_rule: input.previousRule ? JSON.parse(JSON.stringify(input.previousRule)) : null,
    updated_rule: JSON.parse(JSON.stringify(input.updatedRule)),
    reason: input.reason ?? null,
    changed_by: input.userId ?? null,
  });
}

function toDbRule(data: z.infer<typeof ruleSchema>, version = 1) {
  return {
    name: data.name,
    description: data.description ?? "",
    category: data.category,
    priority: data.priority,
    status: data.status,
    starts_at: data.startsAt || null,
    ends_at: data.endsAt || null,
    target_audience: data.targetAudience ?? [],
    conditions: data.conditions,
    actions: data.actions,
    admin_notes: data.adminNotes ?? null,
    version,
    updated_at: new Date().toISOString(),
  };
}

export async function createBusinessRuleAction(input: unknown): Promise<BusinessRulesActionResult> {
  await requireAdmin("/admin/business-rules");
  const parsed = ruleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid rule data" };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const dbRule = {
    ...toDbRule(parsed.data),
    created_by: userData.user?.id ?? null,
    updated_by: userData.user?.id ?? null,
  };

  const { data, error } = await supabase.from("business_rules").insert(dbRule).select("id").single();
  if (error) return { ok: false, error: error.message };

  revalidateAll();
  return { ok: true, id: data.id as string };
}

export async function updateBusinessRuleAction(
  ruleId: string,
  input: unknown
): Promise<BusinessRulesActionResult> {
  await requireAdmin("/admin/business-rules");
  const parsed = ruleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid rule data" };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const existing = await getBusinessRuleById(ruleId);
  if (!existing) return { ok: false, error: "Rule not found" };

  const dbRule = {
    ...toDbRule(parsed.data, existing.version + 1),
    updated_by: userData.user?.id ?? null,
  };

  const { error } = await supabase.from("business_rules").update(dbRule).eq("id", ruleId);
  if (error) return { ok: false, error: error.message };

  const updated = await getBusinessRuleById(ruleId);
  if (updated) {
    await logRuleHistory(supabase, {
      ruleId,
      previousRule: existing,
      updatedRule: updated,
      reason: parsed.data.reason,
      userId: userData.user?.id,
    });
  }

  revalidateAll();
  return { ok: true, id: ruleId };
}

export async function deleteBusinessRuleAction(ruleId: string): Promise<BusinessRulesActionResult> {
  await requireAdmin("/admin/business-rules");
  const supabase = await createClient();
  const { error } = await supabase.from("business_rules").delete().eq("id", ruleId);
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function reorderBusinessRulesAction(
  orderedIds: string[]
): Promise<BusinessRulesActionResult> {
  await requireAdmin("/admin/business-rules");
  const supabase = await createClient();

  const updates = orderedIds.map((id, index) =>
    supabase.from("business_rules").update({ priority: 1000 - index * 10 }).eq("id", id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, error: failed.error.message };

  revalidateAll();
  return { ok: true };
}

export async function updateRuleStatusAction(
  ruleId: string,
  status: string,
  reason?: string
): Promise<BusinessRulesActionResult> {
  await requireAdmin("/admin/business-rules");
  if (!BUSINESS_RULE_STATUSES.includes(status as (typeof BUSINESS_RULE_STATUSES)[number])) {
    return { ok: false, error: "Invalid status" };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const existing = await getBusinessRuleById(ruleId);
  if (!existing) return { ok: false, error: "Rule not found" };

  const { error } = await supabase
    .from("business_rules")
    .update({ status, updated_at: new Date().toISOString(), updated_by: userData.user?.id ?? null })
    .eq("id", ruleId);

  if (error) return { ok: false, error: error.message };

  const updated = await getBusinessRuleById(ruleId);
  if (updated) {
    await logRuleHistory(supabase, {
      ruleId,
      previousRule: existing,
      updatedRule: updated,
      reason: reason ?? `Status changed to ${status}`,
      userId: userData.user?.id,
    });
  }

  revalidateAll();
  return { ok: true };
}

export async function rollbackBusinessRuleAction(historyId: string): Promise<BusinessRulesActionResult> {
  await requireAdmin("/admin/business-rules/history");
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: historyRow, error: histErr } = await supabase
    .from("business_rules_history")
    .select("*")
    .eq("id", historyId)
    .maybeSingle();

  if (histErr || !historyRow?.previous_rule || !historyRow.rule_id) {
    return { ok: false, error: "Cannot rollback — no previous version" };
  }

  const prev = historyRow.previous_rule as Record<string, unknown>;
  const { error } = await supabase
    .from("business_rules")
    .update({
      name: prev.name,
      description: prev.description,
      category: prev.category,
      priority: prev.priority,
      status: prev.status,
      starts_at: prev.starts_at,
      ends_at: prev.ends_at,
      target_audience: prev.target_audience,
      conditions: prev.conditions,
      actions: prev.actions,
      admin_notes: prev.admin_notes,
      version: Number(prev.version ?? 1) + 1,
      updated_at: new Date().toISOString(),
      updated_by: userData.user?.id ?? null,
    })
    .eq("id", historyRow.rule_id);

  if (error) return { ok: false, error: error.message };

  await supabase.from("business_rules_history").update({ rolled_back: true }).eq("id", historyId);
  revalidateAll();
  return { ok: true };
}

export async function simulateBusinessRulesAction(input: unknown) {
  await requireAdmin("/admin/business-rules/simulate");
  const parsed = z
    .object({
      userType: z.enum(["artist", "agency", "sponsor", "admin", "fan"]).optional(),
      agencyPlan: z.enum(["boutique", "growth", "enterprise"]).optional(),
      venueType: z.enum(["community", "club", "theater", "arena", "stadium"]).optional(),
      artistStatus: z.array(z.string()).optional(),
      eventCount: z.number().optional(),
      customTags: z.array(z.string()).optional(),
      isHoliday: z.boolean().optional(),
      dayOfWeek: z.string().optional(),
      couponCode: z.string().optional(),
      bookingAt: z.string().optional(),
    })
    .safeParse(input);

  if (!parsed.success) return { ok: false as const, error: "Invalid simulation input" };

  const { simulateBusinessRules } = await import("@/lib/business-rules/api.server");
  const result = await simulateBusinessRules({
    ...parsed.data,
    now: parsed.data.bookingAt ? new Date(parsed.data.bookingAt) : new Date(),
    artistStatus: parsed.data.artistStatus as ("verified" | "unverified" | "new" | "top_performer")[] | undefined,
  });

  return { ok: true as const, result };
}
