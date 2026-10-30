import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getArtistBalanceSummary, type ArtistBalanceSummary } from "@/lib/services/artist-balance.service";
import { listArtistPayoutHistory } from "@/lib/services/artist-payout.service";
import { isArtistFastPayEnabled } from "@/lib/monetization/fastpay.server";

export type ArtistFastPayOrderRow = {
  orderId: string;
  eventTitle: string | null;
  eventStatus: string | null;
  performanceCompleted: boolean;
  payoutStatus: string;
  pendingCents: number;
  expectedEligibilityAt: string | null;
};

export type ArtistFastPayDashboard = {
  fastPayEnabled: boolean;
  balance: ArtistBalanceSummary;
  pendingOrders: ArtistFastPayOrderRow[];
  payoutHistory: Awaited<ReturnType<typeof listArtistPayoutHistory>>;
};

export async function getArtistFastPayDashboard(
  supabase: SupabaseClient,
  artistId: string,
): Promise<ArtistFastPayDashboard> {
  const [fastPayEnabled, balance, ticketRows, payoutHistory] = await Promise.all([
    isArtistFastPayEnabled(),
    getArtistBalanceSummary(supabase, artistId),
    supabase
      .from("orders")
      .select(
        "id, artist_payout_status, remaining_artist_earnings_cents, artist_earnings_cents, available_at, payout_eligibility_policy, event_id, metadata",
      )
      .eq("artist_id", artistId)
      .eq("order_type", "ticket")
      .eq("status", "paid")
      .in("artist_payout_status", ["pending", "partially_refunded", "available", "processing", "held"])
      .gt("artist_earnings_cents", 0)
      .order("created_at", { ascending: false })
      .limit(25),
    listArtistPayoutHistory(supabase, artistId, 10),
  ]);

  const orders = ticketRows.data ?? [];
  const eventIds = [
    ...new Set(
      orders
        .map((o) => (o.event_id as string | null) ?? (o.metadata as Record<string, unknown>)?.event_id as string)
        .filter(Boolean),
    ),
  ] as string[];

  const eventMap = new Map<string, { title: string; status: string; ended_at: string | null; started_at: string | null }>();
  if (eventIds.length) {
    const { data: events } = await supabase
      .from("events")
      .select("id, title, status, ended_at, started_at")
      .in("id", eventIds);
    for (const e of events ?? []) {
      eventMap.set(e.id as string, {
        title: e.title as string,
        status: e.status as string,
        ended_at: (e.ended_at as string | null) ?? null,
        started_at: (e.started_at as string | null) ?? null,
      });
    }
  }

  const pendingOrders: ArtistFastPayOrderRow[] = orders.map((o) => {
    const eventId =
      (o.event_id as string | null) ?? ((o.metadata as Record<string, unknown> | null)?.event_id as string | undefined);
    const event = eventId ? eventMap.get(eventId) : undefined;
    const performanceCompleted =
      event?.status === "ended" && Boolean(event.started_at) && Boolean(event.ended_at);
    return {
      orderId: o.id as string,
      eventTitle: event?.title ?? null,
      eventStatus: event?.status ?? null,
      performanceCompleted,
      payoutStatus: String(o.artist_payout_status ?? "pending"),
      pendingCents: Number(o.remaining_artist_earnings_cents ?? o.artist_earnings_cents ?? 0),
      expectedEligibilityAt: (o.available_at as string | null) ?? null,
    };
  });

  return {
    fastPayEnabled,
    balance,
    pendingOrders,
    payoutHistory,
  };
}
