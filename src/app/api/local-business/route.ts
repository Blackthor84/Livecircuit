import { NextResponse } from "next/server";
import { getLocalBusinessHub } from "@/lib/data/local-business";

export async function GET() {
  const report = await getLocalBusinessHub();
  return NextResponse.json(report);
}
