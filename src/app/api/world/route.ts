import { NextResponse } from "next/server";
import { getWorldReport } from "@/lib/data/world";

export async function GET() {
  const report = await getWorldReport();
  return NextResponse.json(report);
}
