import { NextResponse } from "next/server";
import { publicMediumCacheHeaders } from "@/lib/api/cache-headers";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { clientRateLimitKey, rateLimit } from "@/lib/api/rate-limit";
import { getVenueThemeApiPayload } from "@/lib/data/venue-themes";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const limit = await rateLimit(clientRateLimitKey(request, "venue-theme"), 180, 60_000);
    if (!limit.ok) {
      return jsonError("Too many requests", 429, {
        "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
      });
    }

    const { slug } = await context.params;
    const payload = await getVenueThemeApiPayload(slug);
    if (!payload) return jsonError("Venue not found", 404);

    return NextResponse.json(payload, { headers: publicMediumCacheHeaders(60) });
  } catch (error) {
    return handleRouteError(error);
  }
}
