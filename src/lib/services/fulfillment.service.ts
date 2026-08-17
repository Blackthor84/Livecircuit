import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { createAdminNotification } from "@/lib/monetization/admin-notifications.service";
import {
  recordCouponRedemption,
  recordPayment,
} from "@/lib/monetization/financial-ledger.service";
import { creditArtistTicketSale } from "@/lib/services/artist-balance.service";
import { getPayoutConfig } from "@/lib/monetization/payout-config.server";
import { reconcileOrderStripeFees } from "@/lib/monetization/stripe-fee-reconciliation.service";
import { generateTicketQrPayload } from "@/lib/tickets/qr";
import { resolveEventIdForTourStop } from "@/lib/services/orders.service";

type OrderRow = {
  id: string;
  user_id: string;
  artist_id: string | null;
  order_type: string;
  status: string;
  total_cents: number;
  gross_cents: number | null;
  platform_fee_cents: number;
  artist_earnings_cents: number;
  metadata: Record<string, unknown> | null;
};

export async function fulfillPaidOrder(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session
): Promise<{ duplicate: boolean }> {
  const sessionId = session.id;

  const { data: orderRaw } = await supabase
    .from("orders")
    .select(
      "id, user_id, artist_id, order_type, status, total_cents, gross_cents, platform_fee_cents, artist_earnings_cents, metadata",
    )
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  let order = orderRaw as OrderRow | null;

  if (!order && session.metadata?.order_id) {
    const { data: byId } = await supabase
      .from("orders")
      .select(
        "id, user_id, artist_id, order_type, status, total_cents, gross_cents, platform_fee_cents, artist_earnings_cents, metadata",
      )
      .eq("id", session.metadata.order_id)
      .maybeSingle();
    order = byId as OrderRow | null;
  }

  if (!order) {
    console.warn("[fulfillment] No order for session", sessionId);
    return { duplicate: false };
  }

  const meta = (order.metadata ?? {}) as Record<string, unknown>;
  if (order.status === "paid" && meta.fulfilled === true) {
    return { duplicate: true };
  }

  const paidAmountCents = session.amount_total;
  const expectedAmountCents = order.gross_cents ?? order.total_cents;
  if (paidAmountCents == null || paidAmountCents !== expectedAmountCents) {
    console.error(
      "[fulfillment] Stripe amount mismatch",
      sessionId,
      "expected",
      expectedAmountCents,
      "got",
      paidAmountCents,
    );
    await createAdminNotification(supabase, {
      category: "payment_fail",
      title: "Checkout amount mismatch",
      message: `Order ${order.id}: expected ${expectedAmountCents} cents, Stripe session paid ${paidAmountCents ?? "unknown"} cents.`,
      severity: "error",
      priority: "high",
      entityKey: order.id,
    });
    return { duplicate: false };
  }

  await supabase
    .from("orders")
    .update({
      status: "paid",
      payment_success_at: new Date().toISOString(),
      stripe_payment_intent_id:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
      stripe_checkout_session_id: session.id,
    })
    .eq("id", order.id);

  const platformFeeCents = Number(
    order.platform_fee_cents ?? meta.platform_fee_cents ?? session.metadata?.platform_fee_cents ?? 0,
  );
  const artistEarningsCents = Number(
    order.artist_earnings_cents ?? meta.artist_earnings_cents ?? session.metadata?.artist_earnings_cents ?? 0,
  );
  const grossCents = Number(order.gross_cents ?? meta.gross_cents ?? session.metadata?.gross_cents ?? paidAmountCents);
  const discountCents = Number(meta.discount_cents ?? session.metadata?.discount_cents ?? 0);
  const subtotalCents = Number(meta.subtotal_cents ?? session.metadata?.subtotal_cents ?? order.total_cents);
  const couponId = (meta.coupon_id as string | undefined) || session.metadata?.coupon_id || null;
  const couponCode = (meta.coupon_code as string | undefined) || session.metadata?.coupon_code || null;

  const paymentRecordId = await recordPayment(supabase, {
    orderId: order.id,
    userId: order.user_id,
    artistId: order.artist_id,
    purchaseType: order.order_type,
    subtotalCents,
    platformFeeCents,
    artistEarningsCents,
    discountCents,
    totalCents: paidAmountCents,
    grossCents,
    couponId: couponId || null,
    couponCode: couponCode || null,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId:
      typeof session.payment_intent === "string" ? session.payment_intent : null,
    metadata: { order_type: order.order_type, ticket_revenue_split: meta.ticket_revenue_split === true },
  });

  if (couponId && discountCents > 0) {
    await recordCouponRedemption(supabase, {
      couponId,
      userId: order.user_id,
      orderId: order.id,
      paymentRecordId,
      discountCents,
      stripeEventId: session.id,
      metadata: { coupon_code: couponCode },
    });
  }

  if (meta.fulfilled === true) {
    return { duplicate: true };
  }

  const userId = order.user_id;
  const orderType = order.order_type;

  if (orderType === "ticket") {
    await fulfillTicketOrder(supabase, order, session);
    if (artistEarningsCents > 0 && order.artist_id) {
      const payoutConfig = await getPayoutConfig(supabase);
      await creditArtistTicketSale(
        supabase,
        order.id,
        new Date().toISOString(),
        payoutConfig.payoutDelayDays,
      );
    }
  } else if (orderType === "tip") {
    await fulfillTipOrder(supabase, order);
  } else if (orderType === "vip") {
    await fulfillVipOrder(supabase, order);
  } else if (orderType === "digital") {
    await fulfillDigitalOrder(supabase, order);
  } else if (orderType === "tour_pass") {
    await fulfillTourPassOrder(supabase, order);
  }

  await supabase
    .from("orders")
    .update({
      metadata: {
        ...meta,
        fulfilled: true,
        fulfilled_at: new Date().toISOString(),
      },
    })
    .eq("id", order.id);

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;
  if (paymentIntentId && order.order_type === "ticket" && order.artist_id) {
    await reconcileOrderStripeFees(supabase, {
      orderId: order.id,
      paymentIntentId,
    }).catch((err) => console.error("[fulfillment] stripe fee reconciliation", err));
  }

  return { duplicate: false };
}

async function fulfillTicketOrder(
  supabase: SupabaseClient,
  order: OrderRow,
  session: Stripe.Checkout.Session
) {
  const meta = order.metadata ?? {};
  let eventId: string | null =
    (meta.event_id as string | undefined) || session.metadata?.event_id || null;
  let tourStopId: string | null =
    (meta.tour_stop_id as string | undefined) || session.metadata?.tour_stop_id || null;
  const tier =
    (meta.tier as string) || session.metadata?.tier || "general";

  if (!eventId && tourStopId) {
    eventId = await resolveEventIdForTourStop(supabase, tourStopId);
  }

  if (!eventId) {
    console.error("[fulfillment] Missing event_id for ticket order", order.id);
    return;
  }

  const priceCents = Number(
    order.gross_cents ?? meta.gross_cents ?? meta.subtotal_cents ?? order.total_cents,
  );
  const { data: ticketId, error } = await supabase.rpc("create_ticket_for_order", {
    p_event_id: eventId,
    p_user_id: order.user_id,
    p_order_id: order.id,
    p_tier: tier,
    p_price_cents: priceCents > 0 ? priceCents : order.total_cents,
  });

  if (error || !ticketId) {
    console.error("[fulfillment] create_ticket_for_order", error?.message);
    return;
  }

  const ticket = { id: ticketId as string };

  const qr_code = generateTicketQrPayload(ticket.id as string);
  await supabase.from("tickets").update({ qr_code }).eq("id", ticket.id);

  const { data: eventMeta } = await supabase
    .from("events")
    .select("title, slug, artists(slug)")
    .eq("id", eventId)
    .maybeSingle();
  const artists = eventMeta?.artists as { slug: string } | { slug: string }[] | null;
  const artistSlug = Array.isArray(artists) ? artists[0]?.slug : artists?.slug;
  if (eventMeta && artistSlug) {
    const { createNotification } = await import("@/lib/services/notifications.service");
    await createNotification({
      userId: order.user_id,
      type: "ticket_reminder",
      title: "Ticket confirmed",
      body: `You're set for ${eventMeta.title as string}.`,
      link: `/artists/${artistSlug}/events/${eventMeta.slug as string}`,
      metadata: { event_id: eventId, ticket_id: ticket.id },
    });
  }
}

async function fulfillTipOrder(supabase: SupabaseClient, order: OrderRow) {
  if (!order.artist_id) return;

  const { data: existing } = await supabase
    .from("tips")
    .select("id")
    .eq("order_id", order.id)
    .maybeSingle();
  if (existing) return;

  const meta = order.metadata ?? {};
  const eventId = (meta.event_id as string | null) ?? null;
  const message = (meta.tip_message as string | null) ?? null;

  await supabase.from("tips").insert({
    from_user_id: order.user_id,
    artist_id: order.artist_id,
    event_id: eventId,
    order_id: order.id,
    amount_cents: order.total_cents,
    message,
  });
}

async function fulfillVipOrder(supabase: SupabaseClient, order: OrderRow) {
  if (!order.artist_id) return;

  const { data: existing } = await supabase
    .from("vip_memberships")
    .select("id")
    .eq("order_id", order.id)
    .maybeSingle();
  if (existing) return;

  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);

  await supabase.from("vip_memberships").upsert(
    {
      user_id: order.user_id,
      artist_id: order.artist_id,
      order_id: order.id,
      price_cents: order.total_cents,
      active: true,
      expires_at: expires.toISOString(),
    },
    { onConflict: "user_id,artist_id" }
  );
}

async function fulfillTourPassOrder(supabase: SupabaseClient, order: OrderRow) {
  const meta = order.metadata ?? {};
  const tourId = (meta.tour_id as string | undefined) ?? null;
  if (!tourId) {
    console.error("[fulfillment] Missing tour_id for tour pass order", order.id);
    return;
  }

  const { data: existing } = await supabase
    .from("tour_passes")
    .select("id")
    .eq("order_id", order.id)
    .maybeSingle();
  if (existing) return;

  const tier = (meta.tier as string) || "general";
  const { data: pass, error } = await supabase
    .from("tour_passes")
    .insert({
      tour_id: tourId,
      user_id: order.user_id,
      order_id: order.id,
      tier,
      price_cents: order.total_cents,
    })
    .select("id")
    .single();

  if (error || !pass) {
    console.error("[fulfillment] tour pass insert", error?.message);
    return;
  }

  const qr_code = generateTicketQrPayload(pass.id as string);
  await supabase.from("tour_passes").update({ qr_code }).eq("id", pass.id);

  const { data: tour } = await supabase
    .from("tours")
    .select("title, slug, artists(slug)")
    .eq("id", tourId)
    .maybeSingle();
  const artists = tour?.artists as { slug: string } | { slug: string }[] | null;
  const artistSlug = Array.isArray(artists) ? artists[0]?.slug : artists?.slug;
  if (tour && artistSlug) {
    const { createNotification } = await import("@/lib/services/notifications.service");
    await createNotification({
      userId: order.user_id,
      type: "ticket_reminder",
      title: "Tour pass confirmed",
      body: `Your pass for ${tour.title as string} is ready — every stop on the route is yours.`,
      link: `/artists/${artistSlug}/tours/${tour.slug as string}`,
      metadata: { tour_id: tourId, tour_pass_id: pass.id },
    });
  }
}

async function fulfillDigitalOrder(supabase: SupabaseClient, order: OrderRow) {
  const meta = order.metadata ?? {};
  const tierId = (meta.festival_tier_id as string | undefined) ?? null;
  if (!tierId) return;

  const { data: existing } = await supabase
    .from("festival_pass_purchases")
    .select("id")
    .eq("order_id", order.id)
    .maybeSingle();
  if (existing) return;

  const { recordFestivalPassPurchase } = await import("@/lib/services/virtual-festivals.service");
  await recordFestivalPassPurchase(supabase, order.user_id, tierId, order.id);
}
