import { NextResponse } from "next/server";
import { getVenueLocalBusinessReport } from "@/lib/data/local-business";

type Props = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Props) {
  const { slug } = await context.params;
  const report = await getVenueLocalBusinessReport(slug);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(report);
}
