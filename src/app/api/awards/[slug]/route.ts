import { NextResponse } from "next/server";
import { getAwardCeremonyDetail } from "@/lib/data/awards";

type Props = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Props) {
  const { slug } = await context.params;
  const ceremony = await getAwardCeremonyDetail(slug);
  if (!ceremony) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(ceremony);
}
