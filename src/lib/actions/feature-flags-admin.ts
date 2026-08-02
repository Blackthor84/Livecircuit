"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { MONETIZATION_CACHE_TAG } from "@/lib/monetization/pricing-resolver.server";
import { createClient } from "@/lib/supabase/server";

export type FeatureFlagActionResult = { ok: true } | { ok: false; error: string };

const VISIBILITY_OPTIONS = [
  "enabled", "disabled", "hidden", "coming_soon", "beta_only", "agency_only", "admin_only",
] as const;

export async function updateFeatureFlagAction(input: unknown): Promise<FeatureFlagActionResult> {
  await requireAdmin("/admin/platform/feature-flags");
  const parsed = z.object({
    flagKey: z.string(),
    label: z.string(),
    description: z.string().optional(),
    visibility: z.enum(VISIBILITY_OPTIONS),
    isEnabled: z.boolean(),
    rolloutPercent: z.number().min(0).max(100),
    rolloutRegions: z.array(z.string()).optional(),
    rolloutRoles: z.array(z.string()).optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    reason: z.string().optional(),
  }).safeParse(input);

  if (!parsed.success) return { ok: false, error: "Invalid feature flag data" };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: existing } = await supabase
    .from("monetization_feature_flags")
    .select("*")
    .eq("flag_key", parsed.data.flagKey)
    .maybeSingle();

  const patch = {
    label: parsed.data.label,
    description: parsed.data.description ?? null,
    visibility: parsed.data.visibility,
    is_enabled: parsed.data.isEnabled,
    rollout_percent: parsed.data.rolloutPercent,
    rollout_regions: parsed.data.rolloutRegions ?? [],
    rollout_roles: parsed.data.rolloutRoles ?? [],
    starts_at: parsed.data.startsAt || null,
    ends_at: parsed.data.endsAt || null,
    version: Number(existing?.version ?? 0) + 1,
    updated_at: new Date().toISOString(),
    updated_by: userData.user?.id ?? null,
  };

  const { error } = await supabase
    .from("monetization_feature_flags")
    .update(patch)
    .eq("flag_key", parsed.data.flagKey);

  if (error) return { ok: false, error: error.message };

  await supabase.from("monetization_feature_flag_history").insert({
    flag_key: parsed.data.flagKey,
    previous_value: existing ? JSON.parse(JSON.stringify(existing)) : null,
    new_value: { ...existing, ...patch },
    reason: parsed.data.reason ?? null,
    changed_by: userData.user?.id ?? null,
  });

  revalidateTag(MONETIZATION_CACHE_TAG, "max");
  revalidatePath("/admin/platform/feature-flags");
  return { ok: true };
}

export async function createFeatureFlagAction(input: unknown): Promise<FeatureFlagActionResult> {
  await requireAdmin("/admin/platform/feature-flags");
  const parsed = z.object({
    flagKey: z.string().regex(/^[a-z0-9_]+$/),
    label: z.string(),
    description: z.string().optional(),
    visibility: z.enum(VISIBILITY_OPTIONS).default("enabled"),
    isEnabled: z.boolean().default(false),
  }).safeParse(input);

  if (!parsed.success) return { ok: false, error: "Invalid feature flag" };

  const supabase = await createClient();
  const { error } = await supabase.from("monetization_feature_flags").insert({
    flag_key: parsed.data.flagKey,
    label: parsed.data.label,
    description: parsed.data.description ?? null,
    visibility: parsed.data.visibility,
    is_enabled: parsed.data.isEnabled,
  });

  if (error) return { ok: false, error: error.message };
  revalidateTag(MONETIZATION_CACHE_TAG, "max");
  revalidatePath("/admin/platform/feature-flags");
  return { ok: true };
}

export async function deleteFeatureFlagAction(flagKey: string): Promise<FeatureFlagActionResult> {
  await requireAdmin("/admin/platform/feature-flags");
  const supabase = await createClient();
  const { error } = await supabase.from("monetization_feature_flags").delete().eq("flag_key", flagKey);
  if (error) return { ok: false, error: error.message };
  revalidateTag(MONETIZATION_CACHE_TAG, "max");
  revalidatePath("/admin/platform/feature-flags");
  return { ok: true };
}
