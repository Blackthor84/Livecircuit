import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { clientRateLimitKey, rateLimit } from "@/lib/api/rate-limit";
import { getSessionUser } from "@/lib/auth/session";
import {
  getSponsorAnalyticsReport,
  sponsorAnalyticsToCsv,
} from "@/lib/data/sponsor-analytics";

type RouteContext = { params: Promise<{ orgId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const limit = await rateLimit(clientRateLimitKey(request, "sponsor-analytics"), 60, 60_000);
    if (!limit.ok) {
      return jsonError("Too many requests", 429, {
        "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
      });
    }

    const user = await getSessionUser();
    if (!user) return jsonError("Unauthorized", 401);

    const { orgId } = await context.params;
    const url = new URL(request.url);
    const days = Math.min(90, Math.max(7, Number(url.searchParams.get("days") ?? 30) || 30));
    const format = url.searchParams.get("format") ?? "json";

    const report = await getSponsorAnalyticsReport(orgId, user.id, days);
    if (!report) return jsonError("Forbidden", 403);

    if (format === "csv") {
      const csv = sponsorAnalyticsToCsv(report);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="sponsor-analytics-${days}d.csv"`,
        },
      });
    }

    return NextResponse.json(report);
  } catch (error) {
    return handleRouteError(error);
  }
}
