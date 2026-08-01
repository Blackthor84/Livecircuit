"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/config/env";
import { createTestUser, deleteAllTestUsers, deleteTestUser, resetTestUser } from "@/lib/testing/create-user";
import { bulkGenerateTestAgencies, createTestAgency } from "@/lib/testing/create-agency";
import { bulkGenerateTestUsers } from "@/lib/testing/bulk";
import type { AgencyScenarioSlug } from "@/lib/agency";
import { runPlatformSimulator } from "@/lib/testing/simulator";
import { PRODUCTION_BULK_CONFIRM_THRESHOLD } from "@/lib/testing/constants";
import { getTestingAccessForUser, requireSuperAdminTesting } from "@/lib/testing/permissions";
import { TestCreationStepError } from "@/lib/testing/step-errors";
import { parseSupabaseError } from "@/lib/testing/parse-error";
import type { SimulatorAction, TestScenarioSlug, TestUserType } from "@/lib/testing/constants";

export type TestingActionResult =
  | { ok: true; success?: true; message?: string; count?: number; userId?: string; steps?: string[] }
  | {
      ok: false;
      success?: false;
      error: string;
      message?: string;
      failedStep?: string;
      databaseError?: string;
      code?: string;
      details?: string;
      hint?: string;
      stack?: string;
      steps?: string[];
    };

const createSchema = z.object({
  type: z.enum(["fan", "artist"]),
  scenario: z.string().min(1),
});

const bulkSchema = z.object({
  count: z.coerce.number().int().min(1).max(10000),
  mix: z.enum(["fans", "artists", "mixed"]),
  confirmProduction: z.boolean().optional(),
});

const agencySchema = z.object({
  scenario: z.string().min(1),
  seedTeamMembers: z.boolean().optional(),
});

const agencyBulkSchema = z.object({
  count: z.coerce.number().int().min(1).max(20),
  scenario: z.string().min(1),
  seedTeamMembers: z.boolean().optional(),
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
    return {
      ok: true,
      success: true,
      userId: user.userId,
      message: `Created ${user.displayName}`,
      steps: user.steps,
    };
  } catch (e) {
    if (e instanceof TestCreationStepError) {
      return e.toResult();
    }
    const parsed = parseSupabaseError(e);
    return {
      ok: false,
      success: false,
      error: parsed.message,
      message: parsed.message,
      databaseError: parsed.message,
      code: parsed.code,
      details: parsed.details,
      hint: parsed.hint,
      stack: parsed.stack ?? (e instanceof Error ? e.stack : undefined),
    };
  }
}

export async function createTestAgencyAction(input: unknown): Promise<TestingActionResult> {
  const ctx = await requireSuperAdminTesting();
  if (!ctx.ok) return ctx;
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase required" };

  const parsed = agencySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid agency input" };

  try {
    const agency = await createTestAgency({
      scenario: parsed.data.scenario as AgencyScenarioSlug,
      createdBy: ctx.userId,
      seedTeamMembers: parsed.data.seedTeamMembers,
    });
    revalidatePath("/admin/testing");
    revalidatePath("/admin/agencies");
    return {
      ok: true,
      message: `Created test agency ${agency.orgName}`,
      userId: agency.ownerUserId,
      steps: agency.steps,
    };
  } catch (e) {
    if (e instanceof TestCreationStepError) return e.toResult();
    return { ok: false, error: e instanceof Error ? e.message : "Agency creation failed" };
  }
}

export async function bulkGenerateTestAgenciesAction(input: unknown): Promise<TestingActionResult> {
  const ctx = await requireSuperAdminTesting();
  if (!ctx.ok) return ctx;
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase required" };

  const parsed = agencyBulkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid bulk agency request" };

  try {
    const created = await bulkGenerateTestAgencies({
      count: parsed.data.count,
      scenario: parsed.data.scenario as AgencyScenarioSlug,
      createdBy: ctx.userId,
      seedTeamMembers: parsed.data.seedTeamMembers,
    });
    revalidatePath("/admin/testing");
    revalidatePath("/admin/agencies");
    return { ok: true, count: created.length, message: `Generated ${created.length} test agencies` };
  } catch (e) {
    if (e instanceof TestCreationStepError) return e.toResult();
    return { ok: false, error: e instanceof Error ? e.message : "Bulk agency generate failed" };
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

export async function repairTestAgencyAccountAction(userId: string): Promise<TestingActionResult> {
  const ctx = await requireSuperAdminTesting();
  if (!ctx.ok) return ctx;
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase required" };

  try {
    const { ensureAgencyAccountDependencies } = await import("@/lib/testing/server");
    const result = await ensureAgencyAccountDependencies({ userId, repairedBy: ctx.userId });
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/testing");
    return { ok: true, message: result.message, userId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Repair failed" };
  }
}
