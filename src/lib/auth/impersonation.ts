import { cookies } from "next/headers";
import {
  ADMIN_SESSION_BACKUP_COOKIE,
  IMPERSONATION_COOKIE,
  type ImpersonationCookiePayload,
} from "@/lib/testing/constants";

export async function getImpersonationState(): Promise<ImpersonationCookiePayload | null> {
  const jar = await cookies();
  const raw = jar.get(IMPERSONATION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ImpersonationCookiePayload;
  } catch {
    return null;
  }
}

export async function isImpersonating(): Promise<boolean> {
  return Boolean(await getImpersonationState());
}

export async function hasAdminSessionBackup(): Promise<boolean> {
  const jar = await cookies();
  return Boolean(jar.get(ADMIN_SESSION_BACKUP_COOKIE)?.value);
}

export function impersonationCookieOptions(maxAge = 60 * 60 * 8) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
