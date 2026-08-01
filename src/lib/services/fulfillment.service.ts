import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { generateTicketQrPayload } from "@/lib/tickets/qr";
import { resolveEventIdForTourStop } from "@/lib/services/orders.service";

type OrderRow = {
  id: string;
  user_id: string;
  artist_id: string | null;
  order_type: string;
  status: string;
  total_cents: number;
  metadata: Record<string, unknown> | null;
};

export async function fulfillPaidOrder(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session
): Promise<{ duplicate: boolean }> {
  const sessionId = session.id;

  const { data: orderRaw } = await supabase
    .from("orders")
    .select("id, user_id, artist_id, order_type, status, total_cents, metadata")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  let order = orderRaw as OrderRow | null;

  if (!order && session.metadata?.order_id) {
    const { data: byId } = await supabase
      .from("orders")
      .select("id, user_id, artist_id, order_type, status, total_cents, metadata")
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

  await supabase
    .from("orders")
    .update({
      status: "paid",
      stripe_payment_intent_id:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
    })
    .eq("id", order.id);

  if (meta.fulfilled === true) {
    return { duplicate: true };
  }

  const userId = order.user_id;
  const orderType = order.order_type;

  if (orderType === "ticket") {
    await fulfillTicketOrder(supabase, order, session);
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

  const { data: existing } = await supabase
    .from("tickets")
    .select("id")
    .eq("order_id", order.id)
    .maybeSingle();
  if (existing) return;

  const unitCents =
    session.amount_total != null && session.amount_total > 0
      ? session.amount_total
      : order.total_cents;

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      event_id: eventId,
      user_id: order.user_id,
      order_id: order.id,
      tier,
      price_cents: unitCents,
    })
    .select("id")
    .single();

  if (error || !ticket) {
    console.error("[fulfillment] ticket insert", error?.message);
    return;
  }

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
