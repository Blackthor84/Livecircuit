import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { getSessionUser } from "@/lib/auth/session";
import { getSeasonDetailReport } from "@/lib/data/seasons";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    const { slug } = await context.params;
    const season = await getSeasonDetailReport(slug, user?.id ?? null);
    if (!season) return jsonError("Not found", 404);
    return NextResponse.json(season);
  } catch (error) {
    return handleRouteError(error);
  }
}
