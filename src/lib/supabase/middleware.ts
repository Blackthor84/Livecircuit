import { NextResponse, type NextRequest } from "next/server";
import { isAuthRequiredPath, loginRedirectUrl } from "@/lib/auth/paths";
import { getSupabaseProjectUrl } from "@/lib/config/env";
import { canAccessPath, isFeatureGatedApiPath, isFeatureGatedPath } from "@/lib/features/access";
import { createServerClient } from "@supabase/ssr";
import type { UserRole } from "@/types/database";

function roleRequiredForPath(pathname: string): UserRole[] | null {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return ["admin", "super_admin"];
  if (pathname.startsWith("/artist/")) return ["artist", "admin", "super_admin"];
  return null;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    getSupabaseProjectUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  let role: UserRole | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = (profile?.role as UserRole | undefined) ?? null;
  }

  if ((isFeatureGatedPath(pathname) || isFeatureGatedApiPath(pathname)) && !canAccessPath(pathname, role)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Feature not available" }, { status: 404 });
    }
    return NextResponse.redirect(new URL("/discover", request.url));
  }

  if (isAuthRequiredPath(pathname) && !user) {
    return NextResponse.redirect(loginRedirectUrl(pathname, request.nextUrl.origin));
  }

  const allowedRoles = roleRequiredForPath(pathname);
  if (user && allowedRoles) {
    if (!role || !allowedRoles.includes(role)) {
      if (allowedRoles.includes("admin") || allowedRoles.includes("super_admin")) {
        return NextResponse.redirect(new URL("/", request.url));
      }
      return NextResponse.redirect(new URL("/register?role=artist", request.url));
    }
  }

  return supabaseResponse;
}
