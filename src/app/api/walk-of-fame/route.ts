import { NextResponse } from "next/server";
import { getWalkOfFameHubReport } from "@/lib/data/walk-of-fame";

export async function GET() {
  const report = await getWalkOfFameHubReport();
  return NextResponse.json(report);
}
