import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isFeatureEnabled } from "@/lib/monetization/feature-flags.server";
import { getMonetizationSnapshot } from "@/lib/monetization/pricing-resolver.server";
import { fastPayEligibilityInstant } from "@/lib/monetization/business-days";
import { createAdminNotification } from "@/lib/monetization/admin-notifications.service";
import { fastPayCancelReason } from "@/lib/monetization/live-event-fastpay";

export const ARTIST_FASTPAY_FLAG_KEY = "artist_fastpay";

export type FastPayPayoutPolicy = "standard_hold" | "fastpay";

export async function isArtistFastPayEnabled(): Promise<boolean> {
  const snapshot = await getMonetizationSnapshot();
  return isFeatureEnabled(snapshot, ARTIST_FASTPAY_FLAG_KEY, {});
}

export async function resolveTicketPayoutPolicyAtFulfillment(): Promise<FastPayPayoutPolicy> {
  return (await isArtistFastPayEnabled()) ? "fastpay" : "standard_hold";
}

export type FastPayEventVerification = {
  ok: boolean;
  reason?: string;
};

export function verifyEventForFastPay(event: {
  status: string;
  started_at: string | null;
  ended_at: string | null;
}): FastPayEventVerification {
  if (event.status === "cancelled") return { ok: false, reason: "cancelled" };
  if (event.status !== "ended") return { ok: false, reason: "not_ended" };
  if (!event.started_at) return { ok: false, reason: "never_started" };
  if (!event.ended_at) return { ok: false, reason: "missing_ended_at" };
  return { ok: true };
}

export async function applyFastPayOnEventEnded(
  supabase: SupabaseClient,
  eventId: string,
): Promise<{ ordersUpdated: number; eligibilityAt: string | null; skipped?: string }> {
  const { data: event } = await supabase
    .from("events")
    .select("id, status, started_at, ended_at")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) return { ordersUpdated: 0, eligibilityAt: null, skipped: "event_not_found" };

  const verification = verifyEventForFastPay({
    status: event.status as string,
    started_at: (event.started_at as string | null) ?? null,
    ended_at: (event.ended_at as string | null) ?? null,
  });
  if (!verification.ok) {
    return { ordersUpdated: 0, eligibilityAt: null, skipped: verification.reason };
  }

  const endedAt = new Date(event.ended_at as string);
  const eligibility = fastPayEligibilityInstant(endedAt);
  const eligibilityIso = eligibility.toISOString();

  const { data: updatedCount, error } = await supabase.rpc("apply_fastpay_eligibility_for_event", {
    p_event_id: eventId,
    p_available_at: eligibilityIso,
  });

  if (error) {
    console.error("[fastpay] apply eligibility", eventId, error.message);
    return { ordersUpdated: 0, eligibilityAt: eligibilityIso, skipped: error.message };
  }

  return { ordersUpdated: Number(updatedCount ?? 0), eligibilityAt: eligibilityIso };
}

export async function holdFastPayOrdersForCancelledEvent(
  supabase: SupabaseClient,
  eventId: string,
  reason: string,
): Promise<{ ordersHeld: number }> {
  const { data: heldCount, error } = await supabase.rpc("hold_fastpay_orders_for_event", {
    p_event_id: eventId,
    p_reason: reason,
  });
  if (error) {
    console.error("[fastpay] hold orders", eventId, error.message);
    return { ordersHeld: 0 };
  }
  const ordersHeld = Number(heldCount ?? 0);
  if (ordersHeld > 0) {
    await createAdminNotification(supabase, {
      category: "revenue_alert",
      title: "FastPay earnings held",
      message: `${ordersHeld} FastPay ticket order(s) for event ${eventId} were moved to held (${reason}). Review refunds and dispute status before release.`,
      severity: "warning",
      entityKey: eventId,
      priority: "high",
    });
  }
  return { ordersHeld };
}

export async function applyFastPayOnEventCancelled(
  supabase: SupabaseClient,
  eventId: string,
  event: { started_at: string | null },
): Promise<{ ordersHeld: number }> {
  const reason = fastPayCancelReason({
    status: "cancelled",
    started_at: event.started_at,
    ended_at: null,
  });
  return holdFastPayOrdersForCancelledEvent(supabase, eventId, reason);
}

export type FastPayAdminExceptionRow = {
  orderId: string;
  artistId: string | null;
  eventId: string | null;
  eventStatus: string | null;
  eventTitle: string | null;
  payoutStatus: string;
  policy: string;
  availableAt: string | null;
  pendingCents: number;
  holdReason: string | null;
};

/** SuperAdmin visibility for stuck or blocked FastPay ticket orders. */
export async function listFastPayAdminExceptions(
  supabase: SupabaseClient,
  limit = 50,
): Promise<FastPayAdminExceptionRow[]> {
  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, artist_id, event_id, artist_payout_status, payout_eligibility_policy, available_at, remaining_artist_earnings_cents, artist_earnings_cents, metadata",
    )
    .eq("order_type", "ticket")
    .eq("status", "paid")
    .eq("payout_eligibility_policy", "fastpay")
    .in("artist_payout_status", ["pending", "partially_refunded", "held"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!orders?.length) return [];

  const eventIds = [
    ...new Set(
      orders
        .map(
          (o) =>
            (o.event_id as string | null) ??
            ((o.metadata as Record<string, unknown> | null)?.event_id as string | undefined),
        )
        .filter(Boolean),
    ),
  ] as string[];

  const eventMap = new Map<string, { title: string; status: string }>();
  if (eventIds.length) {
    const { data: events } = await supabase
      .from("events")
      .select("id, title, status")
      .in("id", eventIds);
    for (const e of events ?? []) {
      eventMap.set(e.id as string, { title: e.title as string, status: e.status as string });
    }
  }

  return orders
    .map((o) => {
      const meta = (o.metadata ?? {}) as Record<string, unknown>;
      const eventId =
        (o.event_id as string | null) ?? (meta.event_id as string | undefined) ?? null;
      const event = eventId ? eventMap.get(eventId) : undefined;
      const holdReason = (meta.fastpay_hold_reason as string | null) ?? null;
      const payoutStatus = String(o.artist_payout_status ?? "pending");
      const eventStatus = event?.status ?? null;
      const needsReview =
        payoutStatus === "held" ||
        (eventStatus === "cancelled" &&
          !["refunded", "available", "paid"].includes(payoutStatus));
      if (!needsReview) return null;

      return {
        orderId: o.id as string,
        artistId: (o.artist_id as string | null) ?? null,
        eventId,
        eventStatus,
        eventTitle: event?.title ?? null,
        payoutStatus,
        policy: String(o.payout_eligibility_policy),
        availableAt: (o.available_at as string | null) ?? null,
        pendingCents: Number(o.remaining_artist_earnings_cents ?? o.artist_earnings_cents ?? 0),
        holdReason,
      };
    })
    .filter((row): row is FastPayAdminExceptionRow => row != null);
}
