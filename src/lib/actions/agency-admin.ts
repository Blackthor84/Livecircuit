"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import type { AgencyPlan } from "@/lib/agency/types";

export type AgencyAdminActionResult = { ok: true } | { ok: false; error: string };

const orgIdSchema = z.object({ orgId: z.string().uuid() });

const planSchema = z.object({
  orgId: z.string().uuid(),
  plan: z.enum(["boutique", "growth", "enterprise"]),
});

async function requirePlatformAdmin() {
  const profile = await requireRole(["admin", "super_admin"]);
  if (!profile) return { ok: false as const, error: "Admin access required" };
  if (!isSupabaseConfigured()) return { ok: false as const, error: "Supabase required" };
  const supabase = await createClient();
  return { ok: true as const, supabase, profile };
}

export async function verifyAgencyAction(input: unknown): Promise<AgencyAdminActionResult> {
  const parsed = orgIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid agency" };

  const ctx = await requirePlatformAdmin();
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase
    .from("agency_organizations")
    .update({ verified: true, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.orgId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/agencies");
  revalidatePath("/agencies");
  return { ok: true };
}

export async function suspendAgencyAction(input: unknown): Promise<AgencyAdminActionResult> {
  const parsed = orgIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid agency" };

  const ctx = await requirePlatformAdmin();
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase
    .from("agency_organizations")
    .update({
      verified: false,
      metadata: { suspended: true, suspended_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.orgId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/agencies");
  return { ok: true };
}

export async function updateAgencyPlanAction(input: unknown): Promise<AgencyAdminActionResult> {
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid plan update" };

  const ctx = await requirePlatformAdmin();
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase
    .from("agency_organizations")
    .update({
      plan: parsed.data.plan as AgencyPlan,
      plan_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.orgId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/agencies");
  return { ok: true };
}

export async function deleteAgencyAction(input: unknown): Promise<AgencyAdminActionResult> {
  const parsed = orgIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid agency" };

  const ctx = await requirePlatformAdmin();
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase.from("agency_organizations").delete().eq("id", parsed.data.orgId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/agencies");
  return { ok: true };
}
