import { NextResponse } from "next/server";
import { getCreatorProfile } from "@/lib/data/marketplace";

type Props = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Props) {
  const { slug } = await context.params;
  const profile = await getCreatorProfile(slug);
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(profile);
}
