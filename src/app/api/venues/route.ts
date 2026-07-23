import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { clientRateLimitKey, rateLimit } from "@/lib/api/rate-limit";
import { listVenuesPublic } from "@/lib/data/venues";
import { venueListQuerySchema } from "@/lib/validations/venues";

export async function GET(request: Request) {
  try {
    const limit = await rateLimit(clientRateLimitKey(request, "venues-list"), 120, 60_000);
    if (!limit.ok) {
      return jsonError("Too many requests", 429, {
        "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
      });
    }

    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    const query = venueListQuerySchema.parse(params);
    const result = await listVenuesPublic(query);

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
