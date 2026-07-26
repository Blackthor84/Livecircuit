import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { isAdminRole } from "@/lib/auth/roles";
import { getArtistMomentumReport } from "@/lib/data/artist-momentum";

type RouteContext = { params: Promise<{ artistId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return jsonError("Unauthorized", 401);

    const { artistId } = await context.params;

    if (!isSupabaseConfigured()) {
      const report = await getArtistMomentumReport(artistId);
      return NextResponse.json(report ?? {});
    }

    const supabase = await createClient();
    const { data: artist } = await supabase
      .from("artists")
      .select("id, user_id")
      .eq("id", artistId)
      .maybeSingle();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!artist || (artist.user_id !== user.id && !isAdminRole(profile?.role))) {
      return jsonError("Forbidden", 403);
    }

    const report = await getArtistMomentumReport(artistId);
    return NextResponse.json(report ?? {});
  } catch (error) {
    return handleRouteError(error);
  }
}
