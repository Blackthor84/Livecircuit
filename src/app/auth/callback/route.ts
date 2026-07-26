import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { finalizeAuthSession } from "@/lib/auth/finalize-session";
import { readPostAuthParam } from "@/lib/auth/redirects";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = readPostAuthParam({
    next: searchParams.get("next"),
    redirect: searchParams.get("redirect"),
  });
  const type = searchParams.get("type");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      await finalizeAuthSession(data.user.id);
      revalidatePath("/", "layout");

      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/settings?recovery=1`);
      }

      if (type === "signup" || type === "email") {
        const loginUrl = new URL("/login", origin);
        loginUrl.searchParams.set("verified", "1");
        if (nextPath !== "/") loginUrl.searchParams.set("next", nextPath);
        return NextResponse.redirect(loginUrl.toString());
      }

      return NextResponse.redirect(`${origin}${nextPath.startsWith("/") ? nextPath : `/${nextPath}`}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
