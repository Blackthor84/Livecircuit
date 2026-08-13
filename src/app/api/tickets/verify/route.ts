import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config/env";
import { authorizeTicketCheckIn } from "@/lib/services/ticket-checkin.service";
import { syncPassportStampForTicket } from "@/lib/services/fan-passport.service";
import { creditCoinsForWatch } from "@/lib/services/coins.service";

/** Artist/staff check-in: validate ticket QR payload (authenticated). */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ valid: false, error: "Not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ valid: false, error: "Sign in required" }, { status: 401 });
  }

  const code = new URL(request.url).searchParams.get("code")?.trim();
  if (!code) {
    return NextResponse.json({ valid: false, error: "Missing code" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: ticket } = await admin
    .from("tickets")
    .select(
      "id, tier, checked_in_at, event_id, events(title, scheduled_at, artists(stage_name, slug))",
    )
    .eq("qr_code", code)
    .maybeSingle();

  if (!ticket) {
    return NextResponse.json({ valid: false, error: "Unknown ticket" });
  }

  const auth = await authorizeTicketCheckIn(supabase, user.id, ticket.event_id as string);
  if (!auth.ok) {
    return NextResponse.json({ valid: false, error: auth.error }, { status: auth.status });
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = (await request.json()) as { code?: string };
  const code = body.code?.trim();
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: ticket } = await admin
    .from("tickets")
    .select("id, user_id, checked_in_at, event_id")
    .eq("qr_code", code)
    .maybeSingle();

  if (!ticket) {
    return NextResponse.json({ error: "Unknown ticket" }, { status: 404 });
  }

  const auth = await authorizeTicketCheckIn(supabase, user.id, ticket.event_id as string);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (ticket.checked_in_at) {
    return NextResponse.json({ ok: true, alreadyCheckedIn: true });
  }

  await admin
    .from("tickets")
    .update({ checked_in_at: new Date().toISOString() })
    .eq("id", ticket.id);

  await syncPassportStampForTicket(admin, ticket.id as string);

  if (ticket.user_id) {
    try {
      await creditCoinsForWatch(admin, ticket.user_id as string, ticket.id as string);
    } catch {
      /* coins optional */
    }
  }

  return NextResponse.json({ ok: true, alreadyCheckedIn: false });
}
