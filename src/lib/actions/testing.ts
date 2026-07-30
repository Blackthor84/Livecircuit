"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/config/env";
import { createTestUser, deleteAllTestUsers, deleteTestUser, resetTestUser } from "@/lib/testing/create-user";
import { bulkGenerateTestUsers } from "@/lib/testing/bulk";
import { runPlatformSimulator } from "@/lib/testing/simulator";
import { PRODUCTION_BULK_CONFIRM_THRESHOLD } from "@/lib/testing/constants";
import { getTestingAccessForUser, requireSuperAdminTesting } from "@/lib/testing/permissions";
import type { SimulatorAction, TestScenarioSlug, TestUserType } from "@/lib/testing/constants";

export type TestingActionResult =
  | { ok: true; message?: string; count?: number; userId?: string }
  | { ok: false; error: string };

const createSchema = z.object({
  type: z.enum(["fan", "artist"]),
  scenario: z.string().min(1),
});

const bulkSchema = z.object({
  count: z.coerce.number().int().min(1).max(10000),
  mix: z.enum(["fans", "artists", "mixed"]),
  confirmProduction: z.boolean().optional(),
});

const simulatorSchema = z.object({
  action: z.string().min(1),
  count: z.coerce.number().int().min(1).max(50000),
});

export async function createTestUserAction(input: unknown): Promise<TestingActionResult> {
  const ctx = await requireSuperAdminTesting();
  if (!ctx.ok) return ctx;
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase required" };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  try {
    const user = await createTestUser({
      type: parsed.data.type as TestUserType,
      scenario: parsed.data.scenario as TestScenarioSlug,
      createdBy: ctx.userId,
    });
    revalidatePath("/admin/testing");
    return { ok: true, userId: user.userId, message: `Created ${user.displayName}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Create failed" };
  }
}

export async function bulkGenerateTestUsersAction(input: unknown): Promise<TestingActionResult> {
  const ctx = await requireSuperAdminTesting();
  if (!ctx.ok) return ctx;
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase required" };

  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid bulk request" };

  if (
    process.env.NODE_ENV === "production" &&
    parsed.data.count >= PRODUCTION_BULK_CONFIRM_THRESHOLD &&
    !parsed.data.confirmProduction
  ) {
    return {
      ok: false,
      error: `Production requires confirmation for ${parsed.data.count}+ users. Pass confirmProduction: true.`,
    };
  }

  try {
    const created = await bulkGenerateTestUsers({
      count: parsed.data.count,
      mix: parsed.data.mix,
      createdBy: ctx.userId,
    });
    revalidatePath("/admin/testing");
    return { ok: true, count: created.length, message: `Generated ${created.length} test users` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Bulk generate failed" };
  }
}

export async function deleteTestUserAction(userId: string): Promise<TestingActionResult> {
  const ctx = await requireSuperAdminTesting();
  if (!ctx.ok) return ctx;

  try {
    await deleteTestUser(userId);
    revalidatePath("/admin/testing");
    return { ok: true, message: "Test user deleted" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Delete failed" };
  }
}

export async function resetTestUserAction(userId: string): Promise<TestingActionResult> {
  const ctx = await requireSuperAdminTesting();
  if (!ctx.ok) return ctx;

  try {
    await resetTestUser(userId, ctx.userId);
    revalidatePath("/admin/testing");
    return { ok: true, message: "Test user reset to scenario defaults" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Reset failed" };
  }
}

export async function deleteAllTestDataAction(): Promise<TestingActionResult> {
  const ctx = await requireSuperAdminTesting();
  if (!ctx.ok) return ctx;

  try {
    const count = await deleteAllTestUsers();
    revalidatePath("/admin/testing");
    return { ok: true, count, message: `Deleted ${count} test accounts` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Delete all failed" };
  }
}

export async function runSimulatorAction(input: unknown): Promise<TestingActionResult> {
  const ctx = await requireSuperAdminTesting();
  if (!ctx.ok) return ctx;

  const parsed = simulatorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid simulator request" };

  try {
    const rows = await runPlatformSimulator({
      action: parsed.data.action as SimulatorAction,
      count: parsed.data.count,
      createdBy: ctx.userId,
    });
    revalidatePath("/admin/testing");
    revalidatePath("/admin/analytics");
    return { ok: true, count: rows, message: `Simulator affected ${rows} rows` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Simulator failed" };
  }
}

export async function grantImpersonationPermissionAction(userId: string): Promise<TestingActionResult> {
  const ctx = await requireSuperAdminTesting();
  if (!ctx.ok) return ctx;

  const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("admin_testing_permissions").upsert({
    user_id: userId,
    can_impersonate: true,
    granted_by: ctx.userId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Impersonation permission granted" };
}

export async function canUseTestingCenterAction(): Promise<{ ok: boolean; superAdmin: boolean; canImpersonate: boolean }> {
  const { getSessionUser } = await import("@/lib/auth/session");
  const user = await getSessionUser();
  if (!user) return { ok: false, superAdmin: false, canImpersonate: false };
  const access = await getTestingAccessForUser(user.id);
  return {
    ok: access.level !== "none",
    superAdmin: access.canManageTestUsers,
    canImpersonate: access.canImpersonate,
  };
}
