import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { clientRateLimitKey, rateLimit } from "@/lib/api/rate-limit";
import { getSessionUser } from "@/lib/auth/session";
import { getVenueLoyaltyPage } from "@/lib/data/venue-loyalty";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const limit = await rateLimit(clientRateLimitKey(request, "venue-loyalty"), 120, 60_000);
    if (!limit.ok) {
      return jsonError("Too many requests", 429, {
        "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
      });
    }

    const { slug } = await context.params;
    const user = await getSessionUser();
    const data = await getVenueLoyaltyPage(slug, user?.id);
    if (!data) return jsonError("Venue not found", 404);

    return NextResponse.json(data);
  } catch (error) {
    return handleRouteError(error);
  }
}
