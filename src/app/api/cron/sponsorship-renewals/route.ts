import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { verifyCronRequest } from "@/lib/auth/cron";
import { processDueRenewalNotifications } from "@/lib/sponsorship/renewal-notifications";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    if (!verifyCronRequest(request)) {
      return jsonError("Unauthorized", 401);
    }

    const result = await processDueRenewalNotifications();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function GET(request: Request) {
  return POST(request);
}
