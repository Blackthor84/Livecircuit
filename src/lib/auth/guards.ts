import { redirect } from "next/navigation";
import { getProfile, getSessionUser, requireRole } from "@/lib/auth/session";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import type { UserRole } from "@/types/database";

/** Redirect unauthenticated users to login, preserving return path via `next`. */
export async function requireUser(nextPath?: string) {
  const user = await getSessionUser();
  if (!user) {
    if (nextPath?.startsWith("/") && !nextPath.startsWith("//")) {
      redirect(`/login?next=${encodeURIComponent(nextPath)}`);
    }
    redirect("/login");
  }
  return user;
}

export async function requireUserProfile() {
  const user = await requireUser();
  const profile = await getProfile();
  if (!profile) redirect("/register");
  return { user, profile };
}

export async function requireRoles(roles: UserRole[], fallback = "/") {
  const profile = await requireRole(roles);
  if (!profile) redirect(fallback);
  return profile;
}

/** Requires admin or super_admin (Command Center access). */
export async function requireAdmin(fallback = "/") {
  return requireRoles([...ADMIN_ROLES], fallback);
}
