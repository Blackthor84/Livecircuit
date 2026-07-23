import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { getSessionUser } from "@/lib/auth/session";
import { getFanPassportReport } from "@/lib/data/fan-passport";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return jsonError("Unauthorized", 401);

    const report = await getFanPassportReport(user.id);
    if (!report) return jsonError("Not found", 404);

    return NextResponse.json(report);
  } catch (error) {
    return handleRouteError(error);
  }
}
