import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getArtistConnectStatus } from "@/lib/stripe/connect";

export class ArtistConnectNotReadyError extends Error {
  constructor(message = "Artist payment setup is incomplete.") {
    super(message);
    this.name = "ArtistConnectNotReadyError";
  }
}

export async function assertArtistConnectReadyForPaidTickets(
  supabase: SupabaseClient,
  artistId: string,
): Promise<{ stripeAccountId: string }> {
  const { status, record } = await getArtistConnectStatus(supabase, artistId);

  if (status !== "ready" || !record.stripe_account_id) {
    throw new ArtistConnectNotReadyError(
      "Artist payment setup is incomplete. Complete Stripe setup in Artist Settings → Payments.",
    );
  }

  return { stripeAccountId: record.stripe_account_id };
}

export async function creditArtistTicketSale(
  supabase: SupabaseClient,
  orderId: string,
  paymentSuccessAt?: string,
  holdDays?: number,
  payoutPolicy: "standard_hold" | "fastpay" = "standard_hold",
): Promise<{ duplicate: boolean }> {
  const { data: existing } = await supabase
    .from("artist_balance_transactions")
    .select("id")
    .eq("order_id", orderId)
    .eq("transaction_type", "ticket_sale")
    .maybeSingle();

  if (existing) return { duplicate: true };

  const { error } = await supabase.rpc("credit_artist_ticket_sale", {
    p_order_id: orderId,
    p_payment_success_at: paymentSuccessAt ?? new Date().toISOString(),
    p_hold_days: holdDays ?? 7,
    p_payout_policy: payoutPolicy,
  });
  if (error) {
    if (error.message.includes("duplicate") || error.code === "23505") {
      return { duplicate: true };
    }
    throw new Error(error.message);
  }

  return { duplicate: false };
}

export async function reverseArtistTicketSale(
  supabase: SupabaseClient,
  orderId: string,
  refundCents: number,
  fullRefund: boolean,
  referenceId?: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("reverse_artist_ticket_sale", {
    p_order_id: orderId,
    p_refund_cents: refundCents,
    p_full_refund: fullRefund,
    p_reference_id: referenceId ?? null,
  });
  if (error) throw new Error(error.message);
}

export type ArtistBalanceSummary = {
  pendingCents: number;
  availableCents: number;
  receivableCents: number;
  lifetimeGrossCents: number;
  lifetimePlatformFeeCents: number;
  lifetimeArtistEarningsCents: number;
  paidOutCents: number;
};

export async function getArtistBalanceSummary(
  supabase: SupabaseClient,
  artistId: string,
): Promise<ArtistBalanceSummary> {
  const { data: balance } = await supabase
    .from("artist_balances")
    .select(
      "pending_cents, available_cents, receivable_cents, lifetime_gross_cents, lifetime_platform_fee_cents, lifetime_artist_earnings_cents, lifetime_paid_out_cents",
    )
    .eq("artist_id", artistId)
    .maybeSingle();

  const { data: paidRows } = await supabase
    .from("artist_payouts")
    .select("amount_cents")
    .eq("artist_id", artistId)
    .eq("status", "paid");

  const paidOutCents =
    Number(balance?.lifetime_paid_out_cents ?? 0) ||
    (paidRows ?? []).reduce((sum, row) => sum + Number(row.amount_cents ?? 0), 0);

  return {
    pendingCents: Number(balance?.pending_cents ?? 0),
    availableCents: Number(balance?.available_cents ?? 0),
    receivableCents: Number(balance?.receivable_cents ?? 0),
    lifetimeGrossCents: Number(balance?.lifetime_gross_cents ?? 0),
    lifetimePlatformFeeCents: Number(balance?.lifetime_platform_fee_cents ?? 0),
    lifetimeArtistEarningsCents: Number(balance?.lifetime_artist_earnings_cents ?? 0),
    paidOutCents,
  };
}

export type ArtistTicketTransaction = {
  orderId: string;
  eventTitle: string | null;
  grossCents: number;
  platformFeeCents: number;
  artistEarningsCents: number;
  payoutStatus: string;
  availableAt: string | null;
  createdAt: string;
};

export async function listArtistTicketTransactions(
  supabase: SupabaseClient,
  artistId: string,
  limit = 20,
): Promise<ArtistTicketTransaction[]> {
  const { data: orders } = await supabase
    .from("orders")
    .select("id, gross_cents, platform_fee_cents, artist_earnings_cents, artist_payout_status, available_at, created_at, metadata")
    .eq("artist_id", artistId)
    .eq("order_type", "ticket")
    .eq("status", "paid")
    .gt("artist_earnings_cents", 0)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!orders?.length) return [];

  const eventIds = orders
    .map((o) => (o.metadata as Record<string, unknown> | null)?.event_id as string | undefined)
    .filter(Boolean) as string[];

  const eventTitles = new Map<string, string>();
  if (eventIds.length) {
    const { data: events } = await supabase.from("events").select("id, title").in("id", eventIds);
    for (const event of events ?? []) {
      eventTitles.set(event.id as string, event.title as string);
    }
  }

  return orders.map((order) => {
    const meta = (order.metadata ?? {}) as Record<string, unknown>;
    const eventId = meta.event_id as string | undefined;
    return {
      orderId: order.id as string,
      eventTitle: eventId ? eventTitles.get(eventId) ?? null : null,
      grossCents: Number(order.gross_cents ?? 0),
      platformFeeCents: Number(order.platform_fee_cents ?? 0),
      artistEarningsCents: Number(order.artist_earnings_cents ?? 0),
      payoutStatus: String(order.artist_payout_status ?? "pending"),
      availableAt: (order.available_at as string | null) ?? null,
      createdAt: order.created_at as string,
    };
  });
}

export type AdminRevenueSummary = {
  grossTicketCents: number;
  platformFeeCents: number;
  artistEarningsCents: number;
  pendingArtistCents: number;
};

export async function getAdminTicketRevenueSummary(
  supabase: SupabaseClient,
): Promise<AdminRevenueSummary> {
  const { data: orders } = await supabase
    .from("orders")
    .select("gross_cents, platform_fee_cents, artist_earnings_cents")
    .eq("order_type", "ticket")
    .eq("status", "paid");

  const { data: balances } = await supabase.from("artist_balances").select("pending_cents");

  const grossTicketCents = (orders ?? []).reduce((sum, row) => sum + Number(row.gross_cents ?? 0), 0);
  const platformFeeCents = (orders ?? []).reduce(
    (sum, row) => sum + Number(row.platform_fee_cents ?? 0),
    0,
  );
  const artistEarningsCents = (orders ?? []).reduce(
    (sum, row) => sum + Number(row.artist_earnings_cents ?? 0),
    0,
  );
  const pendingArtistCents = (balances ?? []).reduce(
    (sum, row) => sum + Number(row.pending_cents ?? 0),
    0,
  );

  return { grossTicketCents, platformFeeCents, artistEarningsCents, pendingArtistCents };
}
