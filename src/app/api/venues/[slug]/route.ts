import { NextResponse } from "next/server";
import { publicMediumCacheHeaders } from "@/lib/api/cache-headers";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { clientRateLimitKey, rateLimit } from "@/lib/api/rate-limit";
import { getVenueBySlug } from "@/lib/data/venues";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const limit = await rateLimit(clientRateLimitKey(request, "venues-detail"), 180, 60_000);
    if (!limit.ok) {
      return jsonError("Too many requests", 429, {
        "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
      });
    }

    const { slug } = await context.params;
    const venue = await getVenueBySlug(slug);

    if (!venue) {
      return jsonError("Venue not found", 404);
    }

    return NextResponse.json(venue, { headers: publicMediumCacheHeaders(45) });
  } catch (error) {
    return handleRouteError(error);
  }
}
