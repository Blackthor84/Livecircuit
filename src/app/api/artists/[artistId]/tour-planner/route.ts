import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { buildTourPlannerReport } from "@/lib/services/tour-planner.service";
import { getArtistTourPlannerReport } from "@/lib/data/tour-planner";

type RouteContext = { params: Promise<{ artistId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return jsonError("Unauthorized", 401);

    const { artistId } = await context.params;

    if (!isSupabaseConfigured()) {
      const demo = await getArtistTourPlannerReport(user.id);
      return NextResponse.json(demo?.plan ?? {});
    }

    const supabase = await createClient();
    const { data: artist } = await supabase
      .from("artists")
      .select("id, user_id, category")
      .eq("id", artistId)
      .maybeSingle();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!artist || (artist.user_id !== user.id && profile?.role !== "admin")) {
      return jsonError("Forbidden", 403);
    }

    const plan = await buildTourPlannerReport(
      supabase,
      artistId,
      (artist.category as string) ?? null
    );

    return NextResponse.json(plan);
  } catch (error) {
    return handleRouteError(error);
  }
}
