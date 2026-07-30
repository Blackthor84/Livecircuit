import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  ADMIN_SESSION_BACKUP_COOKIE,
  IMPERSONATION_COOKIE,
  type ImpersonationCookiePayload,
} from "@/lib/testing/constants";

export async function POST() {
  const jar = await cookies();
  const backupRaw = jar.get(ADMIN_SESSION_BACKUP_COOKIE)?.value;
  const impersonationRaw = jar.get(IMPERSONATION_COOKIE)?.value;

  if (!backupRaw || !impersonationRaw) {
    return NextResponse.json({ ok: false, error: "Not impersonating" }, { status: 400 });
  }

  let backup: { access_token: string; refresh_token: string; adminId: string };
  let impersonation: ImpersonationCookiePayload;
  try {
    backup = JSON.parse(backupRaw) as typeof backup;
    impersonation = JSON.parse(impersonationRaw) as ImpersonationCookiePayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid session state" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.setSession({
    access_token: backup.access_token,
    refresh_token: backup.refresh_token,
  });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const admin = getSupabaseAdmin();
  if (impersonation.auditId) {
    await admin
      .from("impersonation_audit")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", impersonation.auditId);
  }

  jar.delete(ADMIN_SESSION_BACKUP_COOKIE);
  jar.delete(IMPERSONATION_COOKIE);

  return NextResponse.json({ ok: true, redirect: "/admin/testing" });
}
