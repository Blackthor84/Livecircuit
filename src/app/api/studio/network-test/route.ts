import { NextResponse } from "next/server";

const PAYLOAD = new Uint8Array(64 * 1024);

export async function GET() {
  return new NextResponse(PAYLOAD, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  await request.arrayBuffer().catch(() => null);
  return NextResponse.json({ ok: true });
}
