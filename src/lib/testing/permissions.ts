import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export type TestingAccessLevel = "super_admin" | "admin_impersonate" | "none";

export async function getTestingAccessForUser(userId: string): Promise<{
  level: TestingAccessLevel;
  role: UserRole | null;
  canManageTestUsers: boolean;
  canImpersonate: boolean;
}> {
  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const role = (profile?.role as UserRole) ?? null;
  if (role === "super_admin") {
    return { level: "super_admin", role, canManageTestUsers: true, canImpersonate: true };
  }

  if (role === "admin") {
    const { data: perm } = await admin
      .from("admin_testing_permissions")
      .select("can_impersonate")
      .eq("user_id", userId)
      .maybeSingle();
    const canImpersonate = Boolean(perm?.can_impersonate);
    return {
      level: canImpersonate ? "admin_impersonate" : "none",
      role,
      canManageTestUsers: false,
      canImpersonate,
    };
  }

  return { level: "none", role, canManageTestUsers: false, canImpersonate: false };
}

export async function requireTestingCenterAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sign in required" };

  const access = await getTestingAccessForUser(user.id);
  if (access.level === "none") {
    return { ok: false as const, error: "Testing Center access denied" };
  }

  return { ok: true as const, userId: user.id, access, supabase };
}

export async function requireSuperAdminTesting() {
  const ctx = await requireTestingCenterAccess();
  if (!ctx.ok) return ctx;
  if (!ctx.access.canManageTestUsers) {
    return { ok: false as const, error: "Super Admin access required" };
  }
  return ctx;
}

export async function requireImpersonationAccess() {
  const ctx = await requireTestingCenterAccess();
  if (!ctx.ok) return ctx;
  if (!ctx.access.canImpersonate) {
    return { ok: false as const, error: "Impersonation permission required" };
  }
  return ctx;
}

export async function isTestAccount(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("is_test_account")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(data?.is_test_account);
}

export async function filterOutTestUserIds(userIds: string[]): Promise<string[]> {
  if (!userIds.length) return [];
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .in("id", userIds)
    .eq("is_test_account", false);
  const allowed = new Set((data ?? []).map((r) => r.id as string));
  return userIds.filter((id) => allowed.has(id));
}
