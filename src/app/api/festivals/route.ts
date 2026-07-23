import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/errors";
import { getFestivalsHubReport } from "@/lib/data/virtual-festivals";

export async function GET() {
  try {
    const report = await getFestivalsHubReport();
    return NextResponse.json(report);
  } catch (error) {
    return handleRouteError(error);
  }
}
