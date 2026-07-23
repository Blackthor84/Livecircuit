import { NextResponse } from "next/server";
import { publicShortCacheHeaders } from "@/lib/api/cache-headers";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { clientRateLimitKey, rateLimit } from "@/lib/api/rate-limit";
import { getVenueBySlug } from "@/lib/data/venues";
import { listVenueCommunityPosts } from "@/lib/data/venue-community";
import { venueCommunityQuerySchema } from "@/lib/validations/venue-community";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const limit = await rateLimit(clientRateLimitKey(request, "venue-community"), 120, 60_000);
    if (!limit.ok) {
      return jsonError("Too many requests", 429, {
        "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
      });
    }

    const { slug } = await context.params;
    const venue = await getVenueBySlug(slug);
    if (!venue) return jsonError("Venue not found", 404);

    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    const query = venueCommunityQuerySchema.parse(params);

    const result = await listVenueCommunityPosts(venue.id, {
      page: query.cursor ? undefined : query.page,
      limit: query.limit,
      cursor: query.cursor,
    });

    return NextResponse.json(
      {
        venue: { id: venue.id, slug: venue.slug, name: venue.name },
        ...result,
      },
      { headers: publicShortCacheHeaders(20) }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
