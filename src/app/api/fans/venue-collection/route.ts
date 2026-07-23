import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { getSessionUser } from "@/lib/auth/session";
import { getVenueCollectionReport } from "@/lib/data/venue-collection";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const report = await getVenueCollectionReport(user.id);
    return NextResponse.json(report);
  } catch (error) {
    return handleRouteError(error);
  }
}
