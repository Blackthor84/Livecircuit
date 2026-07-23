import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { syncPassportStampForTicket } from "@/lib/services/fan-passport.service";
import { creditCoinsForWatch } from "@/lib/services/coins.service";
import { isSupabaseConfigured } from "@/lib/config/env";

/** Artist/staff check-in: validate ticket QR payload. */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ valid: false, error: "Not configured" }, { status: 503 });
  }

  const code = new URL(request.url).searchParams.get("code")?.trim();
  if (!code) {
    return NextResponse.json({ valid: false, error: "Missing code" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: ticket } = await supabase
    .from("tickets")
    .select(
      "id, tier, checked_in_at, events(title, scheduled_at, artists(stage_name, slug))"
    )
    .eq("qr_code", code)
    .maybeSingle();

  if (!ticket) {
    return NextResponse.json({ valid: false, error: "Unknown ticket" });
  }

  const raw = ticket.events as unknown;
  const event = (Array.isArray(raw) ? raw[0] : raw) as {
    title: string;
    scheduled_at: string;
    artists: { stage_name: string; slug: string } | { stage_name: string; slug: string }[];
  } | null;

  const artist = event?.artists
    ? Array.isArray(event.artists)
      ? event.artists[0]
      : event.artists
    : null;

  return NextResponse.json({
    valid: true,
    checkedIn: Boolean(ticket.checked_in_at),
    tier: ticket.tier,
    eventTitle: event?.title ?? null,
    artistName: artist?.stage_name ?? null,
    scheduledAt: event?.scheduled_at ?? null,
  });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const body = (await request.json()) as { code?: string };
  const code = body.code?.trim();
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, user_id, checked_in_at")
    .eq("qr_code", code)
    .maybeSingle();

  if (!ticket) {
    return NextResponse.json({ error: "Unknown ticket" }, { status: 404 });
  }

  if (ticket.checked_in_at) {
    return NextResponse.json({ ok: true, alreadyCheckedIn: true });
  }

  await supabase
    .from("tickets")
    .update({ checked_in_at: new Date().toISOString() })
    .eq("id", ticket.id);

  await syncPassportStampForTicket(supabase, ticket.id as string);

  if (ticket.user_id) {
    try {
      await creditCoinsForWatch(supabase, ticket.user_id as string, ticket.id as string);
    } catch {
      /* coins optional */
    }
  }

  return NextResponse.json({ ok: true, alreadyCheckedIn: false });
}
