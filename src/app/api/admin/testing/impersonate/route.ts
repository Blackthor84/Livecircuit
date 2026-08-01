import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveAgencyRedirect } from "@/lib/auth/agency-account";
import { verifyAndRepairAgencyForImpersonation } from "@/lib/testing/repair-agency";
import { impersonationCookieOptions } from "@/lib/auth/impersonation";
import {
  ADMIN_SESSION_BACKUP_COOKIE,
  IMPERSONATION_COOKIE,
  type ImpersonationCookiePayload,
} from "@/lib/testing/constants";
import { requireImpersonationAccess } from "@/lib/testing/permissions";

export async function POST(request: Request) {
  const body = (await request.json()) as { userId?: string };
  if (!body.userId) {
    return NextResponse.json({ ok: false, error: "userId required" }, { status: 400 });
  }

  const ctx = await requireImpersonationAccess();
  if (!ctx.ok) {
    return NextResponse.json({ ok: false, error: ctx.error }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const { data: target } = await admin
    .from("profiles")
    .select("id, display_name, role, test_scenario, is_test_account, primary_agency_id, agency_member_role")
    .eq("id", body.userId)
    .maybeSingle();

  if (!target?.is_test_account) {
    return NextResponse.json({ ok: false, error: "Only test accounts can be impersonated" }, { status: 403 });
  }

  let agencyRedirect: string | null = null;
  let agencyOrgId: string | null = (target.primary_agency_id as string | null) ?? null;

  if (target.role === "agency") {
    console.info("[Agency Impersonation] Starting agency impersonation", { userId: body.userId });
    const agencyAccess = await verifyAndRepairAgencyForImpersonation({
      userId: body.userId,
      repairedBy: ctx.userId,
      role: target.role as string,
      primary_agency_id: (target.primary_agency_id as string | null) ?? null,
      agency_member_role: (target.agency_member_role as string | null) ?? null,
    });
    if (!agencyAccess.ok) {
      console.warn("[Agency Impersonation] Validation failed", {
        userId: body.userId,
        error: agencyAccess.error,
        code: agencyAccess.code,
      });
      return NextResponse.json({ ok: false, error: agencyAccess.error, code: agencyAccess.code }, { status: 409 });
    }
    agencyRedirect = agencyAccess.redirect;
    agencyOrgId = agencyAccess.orgId;
    console.info("[Agency Impersonation] Agency session ready", {
      userId: body.userId,
      orgId: agencyOrgId,
      redirect: agencyRedirect,
    });
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "No active session" }, { status: 401 });
  }

  const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(body.userId);
  if (authErr || !authUser.user?.email) {
    return NextResponse.json({ ok: false, error: "Target auth user not found" }, { status: 404 });
  }

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: authUser.user.email,
  });
  if (linkErr || !linkData.properties?.hashed_token) {
    return NextResponse.json({ ok: false, error: linkErr?.message ?? "Failed to generate session" }, { status: 500 });
  }

  const jar = await cookies();
  jar.set(
    ADMIN_SESSION_BACKUP_COOKIE,
    JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      adminId: ctx.userId,
    }),
    impersonationCookieOptions()
  );

  const { error: verifyErr } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "email",
  });
  if (verifyErr) {
    jar.delete(ADMIN_SESSION_BACKUP_COOKIE);
    return NextResponse.json({ ok: false, error: verifyErr.message }, { status: 500 });
  }

  const { data: auditRow } = await admin
    .from("impersonation_audit")
    .insert({
      admin_user_id: ctx.userId,
      target_user_id: body.userId,
      ip_address: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
    })
    .select("id")
    .maybeSingle();

  const payload: ImpersonationCookiePayload = {
    auditId: (auditRow?.id as string) ?? "",
    adminId: ctx.userId,
    targetId: body.userId,
    displayName: (target.display_name as string) ?? null,
    role: target.role as string,
    scenario: (target.test_scenario as string) ?? null,
    primaryAgencyId: agencyOrgId,
    agencyMemberRole: (target.agency_member_role as string) ?? null,
  };

  jar.set(IMPERSONATION_COOKIE, JSON.stringify(payload), impersonationCookieOptions());

  const redirect =
    target.role === "artist"
      ? "/artist/dashboard"
      : agencyRedirect ??
        resolveAgencyRedirect({
          role: target.role as string,
          primary_agency_id: target.primary_agency_id as string | null,
        }) ??
        (target.role === "fan" ? "/discover" : "/");

  console.info("[Impersonation] Session switched, navigating", {
    targetId: body.userId,
    role: target.role,
    redirect,
  });

  return NextResponse.json({ ok: true, redirect, orgId: agencyOrgId });
}
