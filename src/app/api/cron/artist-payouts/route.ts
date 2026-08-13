import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/auth/cron";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  processEligibleArtistPayouts,
  releaseEligibleArtistFunds,
} from "@/lib/services/artist-payout.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const release = await releaseEligibleArtistFunds(supabase);
  const payouts = await processEligibleArtistPayouts(supabase);

  return NextResponse.json({
    ok: true,
    release,
    payouts,
  });
}
