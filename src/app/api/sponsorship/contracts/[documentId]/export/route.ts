import { NextResponse } from "next/server";
import { getContractDocument } from "@/lib/sponsorship/digital-contracts";
import { requireRole } from "@/lib/auth/session";
import { ADMIN_ROLES } from "@/lib/auth/roles";

type Props = { params: Promise<{ documentId: string }> };

/** Returns printable HTML contract — use browser Print → Save as PDF. */
export async function GET(_request: Request, { params }: Props) {
  const profile = await requireRole([...ADMIN_ROLES]);
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = await params;
  const doc = await getContractDocument(documentId);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(doc.contentHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="livecircuit-contract-v${doc.version}.html"`,
    },
  });
}
