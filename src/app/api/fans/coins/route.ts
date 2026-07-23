import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getCoinsHubReport } from "@/lib/data/coins";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const report = await getCoinsHubReport(user.id);
  return NextResponse.json(report);
}
