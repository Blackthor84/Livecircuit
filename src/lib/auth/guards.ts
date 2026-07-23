import { redirect } from "next/navigation";
import { getProfile, getSessionUser, requireRole } from "@/lib/auth/session";
import type { UserRole } from "@/types/database";

export async function requireUser(redirectTo = "/login") {
  const user = await getSessionUser();
  if (!user) redirect(`${redirectTo}?redirect=${encodeURIComponent("/dashboard")}`);
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
