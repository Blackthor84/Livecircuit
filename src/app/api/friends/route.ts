import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getFriendsHubReport } from "@/lib/data/friends";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const report = await getFriendsHubReport(user.id);
  return NextResponse.json(report);
}
