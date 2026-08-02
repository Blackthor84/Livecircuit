import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/auth/cron";
import { publishScheduledPricing } from "@/lib/monetization/scheduled-pricing.server";

export async function POST(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await publishScheduledPricing();
  return NextResponse.json({ ok: true, ...result });
}
