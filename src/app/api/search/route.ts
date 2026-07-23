import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { clientRateLimitKey, rateLimit } from "@/lib/api/rate-limit";
import { searchCatalog } from "@/lib/data/queries";
import { searchQuerySchema } from "@/lib/validations/search";

export async function GET(request: Request) {
  try {
    const limit = await rateLimit(clientRateLimitKey(request, "search"), 120, 60_000);
    if (!limit.ok) {
      return jsonError("Too many requests", 429, {
        "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
      });
    }

    const { q } = searchQuerySchema.parse({
      q: new URL(request.url).searchParams.get("q") ?? "",
    });

    const results = await searchCatalog(q);
    return NextResponse.json(results);
  } catch (error) {
    return handleRouteError(error);
  }
}
