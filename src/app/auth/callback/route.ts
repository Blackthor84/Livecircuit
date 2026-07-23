import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { finalizeAuthSession } from "@/lib/auth/finalize-session";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/discover";
  const type = searchParams.get("type");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      await finalizeAuthSession(data.user.id);

      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/settings?recovery=1`);
      }

      return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : `/${next}`}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
