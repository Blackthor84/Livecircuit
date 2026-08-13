import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import {
  configureArtistManualPayouts,
  getArtistConnectStatus,
  isArtistPayoutReady,
} from "@/lib/stripe/connect";
import { getPayoutConfig } from "@/lib/monetization/payout-config.server";

export type ReleaseEligibleResult = {
  artistsProcessed: number;
  ordersReleased: number;
  centsReleased: number;
};

export type ProcessPayoutsResult = {
  artistsProcessed: number;
  payoutsCreated: number;
  payoutsSkipped: number;
  errors: string[];
};

export async function releaseEligibleArtistFunds(
  supabase: SupabaseClient,
): Promise<ReleaseEligibleResult> {
  const config = await getPayoutConfig(supabase);
  const now = new Date().toISOString();

  const { data: eligibleOrders } = await supabase
    .from("orders")
    .select("id, artist_id")
    .eq("order_type", "ticket")
    .eq("status", "paid")
    .in("artist_payout_status", ["pending", "partially_refunded"])
    .lte("available_at", now)
    .gt("remaining_artist_earnings_cents", 0);

  const artistIds = new Set<string>();
  let ordersReleased = 0;
  let centsReleased = 0;

  for (const row of eligibleOrders ?? []) {
    const orderId = row.id as string;
    const artistId = row.artist_id as string;
    artistIds.add(artistId);

    const { data: released, error } = await supabase.rpc("release_artist_order_earnings", {
      p_order_id: orderId,
    });

    if (error) {
      console.error("[artist-payout] release order", orderId, error.message);
      continue;
    }

    const amount = Number(released ?? 0);
    if (amount > 0) {
      ordersReleased += 1;
      centsReleased += amount;
    }
  }

  void config;
  return {
    artistsProcessed: artistIds.size,
    ordersReleased,
    centsReleased,
  };
}

async function getOrdersForPayout(
  supabase: SupabaseClient,
  artistId: string,
): Promise<Array<{ orderId: string; amountCents: number }>> {
  const { data: orders } = await supabase
    .from("orders")
    .select("id, remaining_artist_earnings_cents, artist_earnings_cents")
    .eq("artist_id", artistId)
    .eq("artist_payout_status", "available")
    .eq("status", "paid")
    .order("available_at", { ascending: true });

  return (orders ?? []).map((o) => ({
    orderId: o.id as string,
    amountCents: Number(o.remaining_artist_earnings_cents ?? o.artist_earnings_cents ?? 0),
  })).filter((o) => o.amountCents > 0);
}

export async function processEligibleArtistPayouts(
  supabase: SupabaseClient,
): Promise<ProcessPayoutsResult> {
  const config = await getPayoutConfig(supabase);
  const stripe = getStripe();
  const errors: string[] = [];
  let artistsProcessed = 0;
  let payoutsCreated = 0;
  let payoutsSkipped = 0;

  const { data: balances } = await supabase
    .from("artist_balances")
    .select("artist_id, available_cents")
    .gt("available_cents", 0);

  for (const row of balances ?? []) {
    const artistId = row.artist_id as string;
    const availableCents = Number(row.available_cents ?? 0);
    artistsProcessed += 1;

    if (availableCents < config.minPayoutCents) {
      payoutsSkipped += 1;
      continue;
    }

    const { status, record } = await getArtistConnectStatus(supabase, artistId);
    if (!isArtistPayoutReady(status, record)) {
      payoutsSkipped += 1;
      continue;
    }

    const stripeAccountId = record.stripe_account_id!;

    if (!record.stripe_payouts_manual) {
      await configureArtistManualPayouts(stripeAccountId);
      await supabase
        .from("artists")
        .update({ stripe_payouts_manual: true, stripe_payouts_schedule: "manual" })
        .eq("id", artistId);
    }

    const { data: processing } = await supabase
      .from("artist_payouts")
      .select("id")
      .eq("artist_id", artistId)
      .eq("status", "processing")
      .maybeSingle();

    if (processing) {
      payoutsSkipped += 1;
      continue;
    }

    const orderAllocations = await getOrdersForPayout(supabase, artistId);
    const allocTotal = orderAllocations.reduce((s, o) => s + o.amountCents, 0);
    const payoutAmount = Math.min(availableCents, allocTotal);

    if (payoutAmount < config.minPayoutCents) {
      payoutsSkipped += 1;
      continue;
    }

    let running = 0;
    const selectedOrders: Array<{ orderId: string; amountCents: number }> = [];
    for (const alloc of orderAllocations) {
      if (running >= payoutAmount) break;
      const take = Math.min(alloc.amountCents, payoutAmount - running);
      if (take <= 0) continue;
      selectedOrders.push({ orderId: alloc.orderId, amountCents: take });
      running += take;
    }

    const idempotencyKey = `payout:${artistId}:${payoutAmount}:${selectedOrders.map((o) => o.orderId).join(",")}`;

    const { data: existingPayout } = await supabase
      .from("artist_payouts")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingPayout) {
      payoutsSkipped += 1;
      continue;
    }

    let stripeBalanceAvailable = payoutAmount;
    try {
      const balance = await stripe.balance.retrieve({}, { stripeAccount: stripeAccountId });
      const usd = balance.available.find((b) => b.currency === "usd");
      stripeBalanceAvailable = usd?.amount ?? 0;
    } catch (e) {
      errors.push(`Balance check failed for ${artistId}: ${e instanceof Error ? e.message : "unknown"}`);
      payoutsSkipped += 1;
      continue;
    }

    if (stripeBalanceAvailable < payoutAmount) {
      payoutsSkipped += 1;
      continue;
    }

    const { data: payoutId, error: reserveError } = await supabase.rpc("try_reserve_artist_payout", {
      p_artist_id: artistId,
      p_amount_cents: payoutAmount,
      p_idempotency_key: idempotencyKey,
    });

    if (reserveError || !payoutId) {
      payoutsSkipped += 1;
      continue;
    }

    await supabase.from("artist_payout_orders").insert(
      selectedOrders.map((o) => ({
        payout_id: payoutId as string,
        order_id: o.orderId,
        amount_cents: o.amountCents,
      })),
    );

    try {
      const stripePayout = await stripe.payouts.create(
        {
          amount: payoutAmount,
          currency: "usd",
          metadata: { artist_id: artistId, payout_id: payoutId as string },
        },
        { stripeAccount: stripeAccountId, idempotencyKey },
      );

      await supabase
        .from("artist_payouts")
        .update({
          stripe_payout_id: stripePayout.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payoutId);

      payoutsCreated += 1;
    } catch (e) {
      await supabase.rpc("release_artist_payout_reservation", {
        p_payout_id: payoutId,
        p_restore_available: true,
      });

      await supabase
        .from("artist_payouts")
        .update({
          failure_reason: e instanceof Error ? e.message : "Stripe payout failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payoutId);

      errors.push(`Payout failed for ${artistId}: ${e instanceof Error ? e.message : "unknown"}`);
    }
  }

  return { artistsProcessed, payoutsCreated, payoutsSkipped, errors };
}

export async function handleStripePayoutEvent(
  supabase: SupabaseClient,
  payout: Stripe.Payout,
  connectedAccountId: string | null,
): Promise<void> {
  const stripePayoutId = payout.id;

  const { data: payoutRow } = await supabase
    .from("artist_payouts")
    .select("id, artist_id, amount_cents, status")
    .eq("stripe_payout_id", stripePayoutId)
    .maybeSingle();

  let row = payoutRow;

  if (!row && connectedAccountId) {
    const { data: byMeta } = await supabase
      .from("artist_payouts")
      .select("id, artist_id, amount_cents, status")
      .contains("metadata", { stripe_account_id: connectedAccountId })
      .eq("status", "processing")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    row = byMeta;
  }

  if (!row) {
    const artistId = payout.metadata?.artist_id;
    const payoutId = payout.metadata?.payout_id;
    if (payoutId) {
      const { data: byId } = await supabase
        .from("artist_payouts")
        .select("id, artist_id, amount_cents, status")
        .eq("id", payoutId)
        .maybeSingle();
      row = byId;
    } else if (artistId) {
      const { data: byArtist } = await supabase
        .from("artist_payouts")
        .select("id, artist_id, amount_cents, status")
        .eq("artist_id", artistId)
        .eq("status", "processing")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      row = byArtist;
    }
  }

  if (!row) {
    console.warn("[artist-payout] payout webhook without matching record", stripePayoutId);
    return;
  }

  if (row.status === "paid" || row.status === "failed") return;

  if (payout.status === "paid") {
    await supabase.rpc("complete_artist_payout", {
      p_payout_id: row.id,
      p_stripe_payout_id: stripePayoutId,
      p_success: true,
      p_failure_reason: null,
    });
    return;
  }

  if (payout.status === "failed" || payout.status === "canceled") {
    await supabase.rpc("release_artist_payout_reservation", {
      p_payout_id: row.id,
      p_restore_available: true,
    });

    await supabase
      .from("artist_payouts")
      .update({
        stripe_payout_id: stripePayoutId,
        failure_reason: payout.failure_message ?? payout.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
  }
}

export async function listArtistPayoutHistory(
  supabase: SupabaseClient,
  artistId: string,
  limit = 20,
) {
  const { data } = await supabase
    .from("artist_payouts")
    .select("id, amount_cents, status, available_at, initiated_at, completed_at, stripe_payout_id, failure_reason, created_at")
    .eq("artist_id", artistId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function getAdminPayoutDashboard(supabase: SupabaseClient) {
  const { data: payouts } = await supabase
    .from("artist_payouts")
    .select(
      "id, artist_id, amount_cents, status, available_at, initiated_at, completed_at, stripe_payout_id, failure_reason, created_at, artists(stage_name, slug)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: balances } = await supabase
    .from("artist_balances")
    .select("pending_cents, available_cents, receivable_cents");

  const totals = {
    pending: 0,
    available: 0,
    processing: 0,
    paid: 0,
    failed: 0,
    held: 0,
    receivable: 0,
  };

  for (const b of balances ?? []) {
    totals.pending += Number(b.pending_cents ?? 0);
    totals.available += Number(b.available_cents ?? 0);
    totals.receivable += Number(b.receivable_cents ?? 0);
  }

  for (const p of payouts ?? []) {
    const status = String(p.status);
    if (status === "processing") totals.processing += Number(p.amount_cents ?? 0);
    if (status === "paid") totals.paid += Number(p.amount_cents ?? 0);
    if (status === "failed") totals.failed += Number(p.amount_cents ?? 0);
  }

  const { count: heldCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("artist_payout_status", "held");

  totals.held = heldCount ?? 0;

  return { payouts: payouts ?? [], totals };
}
