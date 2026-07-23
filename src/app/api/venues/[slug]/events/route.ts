import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { clientRateLimitKey, rateLimit } from "@/lib/api/rate-limit";
import { listVenueEvents } from "@/lib/data/venues";
import { venueEventsQuerySchema } from "@/lib/validations/venues";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const limit = await rateLimit(clientRateLimitKey(request, "venue-events"), 180, 60_000);
    if (!limit.ok) {
      return jsonError("Too many requests", 429, {
        "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
      });
    }

    const { slug } = await context.params;
    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    const query = venueEventsQuerySchema.parse(params);

    const result = await listVenueEvents(slug, {
      status: query.status ?? "all",
      page: query.page,
      limit: query.limit,
    });

    if (!result) {
      return jsonError("Venue not found", 404);
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
