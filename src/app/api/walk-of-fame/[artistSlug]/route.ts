import { NextResponse } from "next/server";
import { getArtistWalkOfFameReport } from "@/lib/data/walk-of-fame";

type Props = { params: Promise<{ artistSlug: string }> };

export async function GET(_request: Request, context: Props) {
  const { artistSlug } = await context.params;
  const report = await getArtistWalkOfFameReport(artistSlug);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(report);
}
