import { NextResponse } from "next/server";
import { getLiveAccessForEvent } from "@/lib/actions/live-event";

type Params = { params: Promise<{ eventId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { eventId } = await params;
  const access = await getLiveAccessForEvent(eventId);
  return NextResponse.json(access);
}
