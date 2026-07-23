import { NextResponse } from "next/server";
import { getMarketplaceHub } from "@/lib/data/marketplace";

export async function GET() {
  const report = await getMarketplaceHub();
  return NextResponse.json(report);
}
