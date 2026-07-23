import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getGamificationReport } from "@/lib/data/gamification";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const report = await getGamificationReport(user.id);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(report);
}
