import { NextResponse } from "next/server";
import { getAwardsHubReport } from "@/lib/data/awards";

export async function GET() {
  const report = await getAwardsHubReport();
  return NextResponse.json(report);
}
