import { NextResponse } from "next/server";
import { aiServices } from "@/lib/ai/stubs";

export async function GET() {
  return NextResponse.json({
    message: "AI endpoints are architecture stubs only.",
    services: Object.keys(aiServices),
  });
}
