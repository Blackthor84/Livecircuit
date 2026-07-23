import { NextResponse } from "next/server";
import { getLocalBusinessDetail } from "@/lib/data/local-business";
import { getSessionUser } from "@/lib/auth/session";

type Props = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Props) {
  const { slug } = await context.params;
  const user = await getSessionUser();
  const detail = await getLocalBusinessDetail(slug, user?.id ?? null);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(detail);
}
