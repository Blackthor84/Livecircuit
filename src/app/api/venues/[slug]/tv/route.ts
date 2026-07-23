import { NextResponse } from "next/server";
import { getVenueTvReport } from "@/lib/data/venue-tv";

type Props = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Props) {
  const { slug } = await context.params;
  const report = await getVenueTvReport(slug);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(report);
}
