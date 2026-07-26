"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

export type ObserverActionResult = { ok: true } | { ok: false; error: string };

const grantSchema = z.object({
  username: z.string().min(2).max(40),
  label: z.string().max(120).optional(),
});

const toggleSchema = z.object({
  userId: z.string().uuid(),
  active: z.boolean(),
});

async function requireAdminContext() {
  const profile = await requireRole(["admin"]);
  if (!profile) return { ok: false as const, error: "Admin access required" };
  if (!isSupabaseConfigured()) return { ok: false as const, error: "Supabase required" };
  const supabase = await createClient();
  return { ok: true as const, supabase, adminId: profile.id as string };
}

export async function grantObserverAccountAction(input: unknown): Promise<ObserverActionResult> {
  const parsed = grantSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid observer request" };

  const ctx = await requireAdminContext();
  if (!ctx.ok) return ctx;

  const normalized = parsed.data.username.trim().replace(/^@/, "").toLowerCase();
  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("id, role")
    .eq("username", normalized)
    .maybeSingle();

  if (!profile) return { ok: false, error: "User not found" };
  if (profile.role === "admin") return { ok: false, error: "Admins already have full access" };

  const { error } = await ctx.supabase.from("observer_accounts").upsert(
    {
      user_id: profile.id,
      granted_by: ctx.adminId,
      label: parsed.data.label?.trim() || null,
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/observers");
  return { ok: true };
}

export async function setObserverActiveAction(input: unknown): Promise<ObserverActionResult> {
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request" };

  const ctx = await requireAdminContext();
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase
    .from("observer_accounts")
    .update({ active: parsed.data.active, updated_at: new Date().toISOString() })
    .eq("user_id", parsed.data.userId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/observers");
  return { ok: true };
}

export async function revokeObserverAccountAction(userId: string): Promise<ObserverActionResult> {
  const ctx = await requireAdminContext();
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase.from("observer_accounts").delete().eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/observers");
  return { ok: true };
}
