import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { requireArtistContext } from "@/lib/auth/artist-context";
import { isStripeConfigured } from "@/lib/config/env";
import {
  beginArtistConnectOnboarding,
  getArtistConnectStatus,
  refreshArtistConnectStatusFromStripe,
} from "@/lib/stripe/connect";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const ctx = await requireArtistContext();
    if (!ctx.ok) return jsonError(ctx.error, ctx.status);

    const admin = getSupabaseAdmin();
    const { status, record } = await getArtistConnectStatus(admin, ctx.artist.id);

    return NextResponse.json({
      status,
      connected: Boolean(record.stripe_account_id),
      chargesEnabled: record.stripe_charges_enabled,
      payoutsEnabled: record.stripe_payouts_enabled,
      detailsSubmitted: record.stripe_details_submitted,
      requirementsDue: record.stripe_requirements_due,
      updatedAt: record.stripe_connect_updated_at,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireArtistContext();
    if (!ctx.ok) return jsonError(ctx.error, ctx.status);

    if (!isStripeConfigured()) {
      return jsonError("Stripe is not configured", 503);
    }

    const body = (await request.json().catch(() => ({}))) as { mode?: string };
    const mode = body.mode === "manage" ? "manage" : "onboarding";

    const admin = getSupabaseAdmin();
    const { url, status } = await beginArtistConnectOnboarding({
      supabase: admin,
      artistId: ctx.artist.id,
      email: ctx.user.email ?? "",
      displayName: ctx.artist.stage_name,
      mode,
    });

    return NextResponse.json({ url, status });
  } catch (error) {
    return handleRouteError(error);
  }
}

/** Optional sync endpoint after return from Stripe (server-derived status only). */
export async function PATCH() {
  try {
    const ctx = await requireArtistContext();
    if (!ctx.ok) return jsonError(ctx.error, ctx.status);

    if (!isStripeConfigured()) {
      return jsonError("Stripe is not configured", 503);
    }

    const admin = getSupabaseAdmin();
    const status = await refreshArtistConnectStatusFromStripe(admin, ctx.artist.id);
    return NextResponse.json({ status });
  } catch (error) {
    return handleRouteError(error);
  }
}
