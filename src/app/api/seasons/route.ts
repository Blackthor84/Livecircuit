import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/errors";
import { getSeasonsHubReport } from "@/lib/data/seasons";

export async function GET() {
  try {
    const report = await getSeasonsHubReport();
    return NextResponse.json(report);
  } catch (error) {
    return handleRouteError(error);
  }
}
