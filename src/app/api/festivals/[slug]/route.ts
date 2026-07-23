import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { getSessionUser } from "@/lib/auth/session";
import { getFestivalDetailReport } from "@/lib/data/virtual-festivals";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    const { slug } = await context.params;
    const festival = await getFestivalDetailReport(slug, user?.id ?? null);
    if (!festival) return jsonError("Not found", 404);
    return NextResponse.json(festival);
  } catch (error) {
    return handleRouteError(error);
  }
}
