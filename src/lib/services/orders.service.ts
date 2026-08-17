import type { SupabaseClient } from "@supabase/supabase-js";
import type { CheckoutBody } from "@/lib/validations/checkout";

export type OrderLinePricing = {
  unitAmountCents: number;
  currency: string;
  description: string;
};

export type ResolvedCheckout = {
  pricing: OrderLinePricing;
  artistId: string | null;
  eventId: string | null;
  tourStopId: string | null;
  tourId: string | null;
  productId: string | null;
  tier: "general" | "vip";
  festivalTierId?: string | null;
  festivalId?: string | null;
};

export class CheckoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutValidationError";
  }
}

/** Event statuses that allow public discovery and ticket purchase */
export const SELLABLE_EVENT_STATUSES = ["scheduled", "live"] as const;

export async function resolveEventIdForTourStop(
  supabase: SupabaseClient,
  tourStopId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("events")
    .select("id")
    .eq("tour_stop_id", tourStopId)
    .maybeSingle();
  return (data?.id as string) ?? null;
}

export async function resolveCheckout(
  supabase: SupabaseClient,
  body: CheckoutBody
): Promise<ResolvedCheckout> {
  const currency = "USD";
  const tier = body.tier ?? "general";

  let eventId = body.eventId ?? null;
  const tourStopId = body.tourStopId ?? null;
  let productId: string | null = null;

  if (!eventId && tourStopId) {
    eventId = await resolveEventIdForTourStop(supabase, tourStopId);
  }

  if (body.type === "ticket" && body.eventId) {
    const { data: event } = await supabase
      .from("events")
      .select("title, artist_id, status, tour_stops(ticket_price_cents, vip_price_cents, virtual_location_label, tours(status))")
      .eq("id", body.eventId)
      .maybeSingle();

    if (!event) {
      throw new CheckoutValidationError("Event not found");
    }

    if (!SELLABLE_EVENT_STATUSES.includes(event.status as (typeof SELLABLE_EVENT_STATUSES)[number])) {
      throw new CheckoutValidationError("This event is not on sale");
    }

    if (event?.tour_stops) {
      const raw = event.tour_stops as
        | {
            ticket_price_cents: number;
            vip_price_cents: number | null;
            virtual_location_label: string;
            tours: { status: string } | { status: string }[] | null;
          }
        | {
            ticket_price_cents: number;
            vip_price_cents: number | null;
            virtual_location_label: string;
            tours: { status: string } | { status: string }[] | null;
          }[];
      const stop = Array.isArray(raw) ? raw[0] : raw;
      if (stop) {
        const tours = stop.tours;
        const tourStatus = Array.isArray(tours) ? tours[0]?.status : tours?.status;
        if (tourStatus && tourStatus !== "published") {
          throw new CheckoutValidationError("This tour is not published yet");
        }
        const unitAmountCents =
          tier === "vip"
            ? stop.vip_price_cents ?? stop.ticket_price_cents
            : stop.ticket_price_cents;
        if (unitAmountCents <= 0) {
          throw new CheckoutValidationError("Ticket price is not configured for this event");
        }
        return {
          pricing: {
            unitAmountCents,
            currency,
            description:
              tier === "vip"
                ? `VIP — ${(event.title as string) ?? stop.virtual_location_label}`
                : ((event.title as string) ?? `Ticket — ${stop.virtual_location_label}`),
          },
          artistId: (event.artist_id as string) ?? null,
          eventId: body.eventId,
          tourStopId,
          tourId: null,
          productId: null,
          tier,
        };
      }
    }
    throw new CheckoutValidationError("Ticket pricing is not configured for this event");
  }

  if (body.type === "ticket" && tourStopId) {
    const { data: stop } = await supabase
      .from("tour_stops")
      .select("ticket_price_cents, vip_price_cents, virtual_location_label, tour_id, tours(artist_id, status)")
      .eq("id", tourStopId)
      .maybeSingle();
    if (!stop) {
      throw new CheckoutValidationError("Tour stop not found");
    }
    const tours = stop.tours as { artist_id: string; status: string } | { artist_id: string; status: string }[] | null;
    const tour = Array.isArray(tours) ? tours[0] : tours;
    if (!tour || tour.status !== "published") {
      throw new CheckoutValidationError("This tour is not published yet");
    }
    const unitAmountCents =
      tier === "vip" ? stop.vip_price_cents ?? stop.ticket_price_cents : stop.ticket_price_cents;
    if (unitAmountCents <= 0) {
      throw new CheckoutValidationError("Ticket price is not configured for this stop");
    }
    return {
      pricing: {
        unitAmountCents,
        currency,
        description:
          tier === "vip"
            ? `VIP — ${stop.virtual_location_label}`
            : `Ticket — ${stop.virtual_location_label}`,
      },
      artistId: tour.artist_id ?? null,
      eventId,
      tourStopId,
      tourId: (stop.tour_id as string) ?? null,
      productId: null,
      tier,
    };
  }

  if (body.type === "tour_pass" && body.tourId) {
    const { data: tour } = await supabase
      .from("tours")
      .select("id, title, tour_pass_price_cents, artist_id, status")
      .eq("id", body.tourId)
      .eq("status", "published")
      .maybeSingle();

    if (tour?.tour_pass_price_cents && tour.tour_pass_price_cents > 0) {
      return {
        pricing: {
          unitAmountCents: tour.tour_pass_price_cents,
          currency,
          description: `Tour pass — ${tour.title}`,
        },
        artistId: tour.artist_id as string,
        eventId: null,
        tourStopId: null,
        tourId: tour.id as string,
        productId: null,
        tier,
      };
    }
  }

  if (body.type === "merch" && body.productId) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        body.productId
      );
    if (isUuid) {
      productId = body.productId;
      const { data: product } = await supabase
        .from("products")
        .select("id, name, price_cents, artist_id, active")
        .eq("id", body.productId)
        .maybeSingle();
      if (product?.active) {
        return {
          pricing: {
            unitAmountCents: product.price_cents,
            currency,
            description: product.name,
          },
          artistId: (product.artist_id as string) ?? null,
          eventId,
          tourStopId,
          tourId: null,
          productId,
          tier,
        };
      }
    }
  }

  if (body.type === "vip") {
    let artistId: string | null = body.artistId ?? null;
    let unitAmountCents = 999;

    if (body.artistId) {
      const { data: artist } = await supabase
        .from("artists")
        .select("id, stage_name")
        .eq("id", body.artistId)
        .maybeSingle();
      if (artist) {
        artistId = artist.id;
        return {
          pricing: {
            unitAmountCents,
            currency,
            description: `VIP — ${artist.stage_name}`,
          },
          artistId,
          eventId,
          tourStopId,
          tourId: null,
          productId: null,
          tier: "vip",
        };
      }
    }

    if (body.artistSlug) {
      const { data: artist } = await supabase
        .from("artists")
        .select("id, stage_name")
        .eq("slug", body.artistSlug)
        .maybeSingle();
      if (artist) {
        artistId = artist.id;
        return {
          pricing: {
            unitAmountCents,
            currency,
            description: `VIP — ${artist.stage_name}`,
          },
          artistId,
          eventId,
          tourStopId,
          tourId: null,
          productId: null,
          tier: "vip",
        };
      }
    }

    return {
      pricing: { unitAmountCents, currency, description: "VIP membership" },
      artistId,
      eventId,
      tourStopId,
      tourId: null,
      productId: null,
      tier: "vip",
    };
  }

  if (body.type === "tip") {
    const cents = body.tipAmountCents ?? 500;
    let artistId = body.artistId ?? null;
    if (!artistId && body.artistSlug) {
      const { data: artist } = await supabase
        .from("artists")
        .select("id")
        .eq("slug", body.artistSlug)
        .maybeSingle();
      artistId = artist?.id ?? null;
    }
    if (!artistId && eventId) {
      const { data: event } = await supabase
        .from("events")
        .select("artist_id")
        .eq("id", eventId)
        .maybeSingle();
      artistId = (event?.artist_id as string) ?? null;
    }
    return {
      pricing: {
        unitAmountCents: cents,
        currency,
        description: body.tipMessage?.trim()
          ? `Tip — ${body.tipMessage.trim().slice(0, 80)}`
          : "Artist tip",
      },
      artistId,
      eventId,
      tourStopId,
      tourId: null,
      productId: null,
      tier,
    };
  }

  if (body.type === "festival" && body.festivalTierId) {
    const { data: tier } = await supabase
      .from("festival_pass_tiers")
      .select("id, name, price_cents, festival_id, virtual_festivals(name)")
      .eq("id", body.festivalTierId)
      .maybeSingle();

    if (tier) {
      const festRaw = tier.virtual_festivals as { name: string } | { name: string }[] | null;
      const fest = Array.isArray(festRaw) ? festRaw[0] : festRaw;
      return {
        pricing: {
          unitAmountCents: tier.price_cents as number,
          currency,
          description: `${fest?.name ?? "Festival"} — ${tier.name as string}`,
        },
        artistId: null,
        eventId: null,
        tourStopId: null,
        tourId: null,
        productId: null,
        tier: "general",
        festivalTierId: tier.id as string,
        festivalId: tier.festival_id as string,
      };
    }
  }

  throw new CheckoutValidationError(`Unable to resolve pricing for checkout type "${body.type}"`);
}

/** @deprecated use resolveCheckout */
export async function resolveCheckoutPricing(
  supabase: SupabaseClient,
  body: CheckoutBody
): Promise<OrderLinePricing> {
  const resolved = await resolveCheckout(supabase, body);
  return resolved.pricing;
}

export async function resolveArtistIdForCheckout(
  supabase: SupabaseClient,
  body: CheckoutBody
): Promise<string | null> {
  const resolved = await resolveCheckout(supabase, body);
  return resolved.artistId;
}

export async function assertCheckoutAllowed(
  supabase: SupabaseClient,
  userId: string,
  body: CheckoutBody,
  resolved: ResolvedCheckout
) {
  if (body.type === "tour_pass") {
    if (!body.tourId) {
      throw new CheckoutValidationError("Choose a tour for the tour pass");
    }
    const { data: existing } = await supabase
      .from("tour_passes")
      .select("id")
      .eq("tour_id", body.tourId)
      .eq("user_id", userId)
      .eq("tier", resolved.tier)
      .maybeSingle();
    if (existing) {
      throw new CheckoutValidationError("You already have a tour pass for this tour");
    }
    const { data: tour } = await supabase
      .from("tours")
      .select("status, tour_pass_price_cents")
      .eq("id", body.tourId)
      .maybeSingle();
    if (!tour || tour.status !== "published" || !tour.tour_pass_price_cents) {
      throw new CheckoutValidationError("Tour pass is not available for this tour");
    }
  }

  if (body.type === "ticket") {
    if (body.quantity && body.quantity > 1) {
      throw new CheckoutValidationError("One ticket per checkout for this event");
    }
    if (!resolved.eventId) {
      throw new CheckoutValidationError(
        "This stop is not linked to a live event yet. Publish the tour or try again shortly."
      );
    }

    const { data: existing } = await supabase
      .from("tickets")
      .select("id")
      .eq("event_id", resolved.eventId)
      .eq("user_id", userId)
      .eq("tier", resolved.tier)
      .maybeSingle();
    if (existing) {
      throw new CheckoutValidationError("You already have a ticket for this tier");
    }

    const { data: event } = await supabase
      .from("events")
      .select("status, tour_stops(capacity, vip_capacity, tours(status))")
      .eq("id", resolved.eventId)
      .maybeSingle();
    if (!event) {
      throw new CheckoutValidationError("This event is not available for ticket sales");
    }
    if (event.status === "draft") {
      throw new CheckoutValidationError("This event is not on sale yet");
    }
    if (!SELLABLE_EVENT_STATUSES.includes(event.status as (typeof SELLABLE_EVENT_STATUSES)[number])) {
      throw new CheckoutValidationError("This event is not available for ticket sales");
    }

    const raw = event.tour_stops as
      | { capacity: number; vip_capacity: number | null; tours: { status: string } | { status: string }[] | null }
      | { capacity: number; vip_capacity: number | null; tours: { status: string } | { status: string }[] | null }[];
    const stop = Array.isArray(raw) ? raw[0] : raw;
    if (stop) {
      const tours = stop.tours;
      const tourStatus = Array.isArray(tours) ? tours[0]?.status : tours?.status;
      if (tourStatus && tourStatus !== "published") {
        throw new CheckoutValidationError("This tour is not published yet");
      }
    }

    const { error: capacityError } = await supabase.rpc("assert_ticket_capacity_available", {
      p_event_id: resolved.eventId,
      p_tier: resolved.tier,
      p_quantity: 1,
      p_exclude_order_id: null,
    });
    if (capacityError) {
      const message = capacityError.message ?? "Could not reserve ticket";
      if (message.includes("Sold out")) {
        throw new CheckoutValidationError("This tier is sold out");
      }
      if (message.includes("not on sale") || message.includes("not available")) {
        throw new CheckoutValidationError("This event is not available for ticket sales");
      }
      throw new CheckoutValidationError(message);
    }

    if (resolved.tier === "vip" && resolved.pricing.unitAmountCents <= 0) {
      throw new CheckoutValidationError("VIP is not offered for this event");
    }
  }

  if (body.type === "merch" && !resolved.productId) {
    throw new CheckoutValidationError("Product not found");
  }

  if (body.type === "tip") {
    if (!resolved.artistId) {
      throw new CheckoutValidationError("Choose an artist to tip");
    }
    const cents = body.tipAmountCents ?? 500;
    if (cents < 100 || cents > 500_00) {
      throw new CheckoutValidationError("Tip must be between $1 and $500");
    }
  }

  if (body.type === "vip" && !resolved.artistId) {
    throw new CheckoutValidationError("Choose an artist for VIP membership");
  }

  if (body.type === "festival" && body.festivalTierId) {
    const { data: existing } = await supabase
      .from("festival_pass_purchases")
      .select("id")
      .eq("user_id", userId)
      .eq("tier_id", body.festivalTierId)
      .eq("status", "paid")
      .maybeSingle();
    if (existing) {
      throw new CheckoutValidationError("You already own this festival pass");
    }
  }
}

export async function createPendingOrder(
  supabase: SupabaseClient,
  input: {
    userId: string;
    resolved: ResolvedCheckout;
    body: CheckoutBody;
    stripeCheckoutSessionId?: string | null;
    checkoutTotals?: {
      subtotalCents: number;
      platformFeeCents: number;
      discountCents: number;
      totalCents: number;
      couponId?: string | null;
      couponCode?: string | null;
      grossCents?: number | null;
      artistEarningsCents?: number | null;
      lockedPlatformFeePercent?: number | null;
      ticketRevenueSplit?: boolean;
    };
  }
) {
  const quantity = bodyQuantity(input.body);
  const lineTotal = input.resolved.pricing.unitAmountCents * quantity;
  const totals = input.checkoutTotals ?? {
    subtotalCents: lineTotal,
    platformFeeCents: 0,
    discountCents: 0,
    totalCents: lineTotal,
  };
  const grossCents = totals.grossCents ?? totals.totalCents;
  const artistEarningsCents = totals.artistEarningsCents ?? 0;
  const orderType =
    input.body.type === "digital" || input.body.type === "festival"
      ? "digital"
      : input.body.type === "tour_pass"
        ? "tour_pass"
        : input.body.type;

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      user_id: input.userId,
      artist_id: input.resolved.artistId,
      order_type: orderType,
      status: "pending",
      subtotal_cents: totals.subtotalCents,
      tax_cents: 0,
      gross_cents: totals.ticketRevenueSplit ? grossCents : null,
      platform_fee_cents: totals.platformFeeCents,
      artist_earnings_cents: totals.ticketRevenueSplit ? artistEarningsCents : 0,
      total_cents: totals.totalCents,
      currency: input.resolved.pricing.currency,
      stripe_checkout_session_id: input.stripeCheckoutSessionId ?? null,
      artist_payout_status: totals.ticketRevenueSplit ? "pending" : "pending",
      metadata: {
        event_id: input.resolved.eventId,
        tour_stop_id: input.resolved.tourStopId,
        tour_id: input.resolved.tourId,
        product_id: input.resolved.productId,
        tier: input.resolved.tier,
        tip_message: input.body.tipMessage ?? null,
        festival_tier_id: input.resolved.festivalTierId ?? input.body.festivalTierId ?? null,
        festival_id: input.resolved.festivalId ?? null,
        platform_fee_cents: totals.platformFeeCents,
        discount_cents: totals.discountCents,
        coupon_id: totals.couponId ?? null,
        coupon_code: totals.couponCode ?? null,
        gross_cents: totals.ticketRevenueSplit ? grossCents : null,
        artist_earnings_cents: totals.ticketRevenueSplit ? artistEarningsCents : null,
        locked_platform_fee_percent: totals.lockedPlatformFeePercent ?? null,
        ticket_revenue_split: totals.ticketRevenueSplit ?? false,
        fulfilled: false,
      },
    })
    .select("id")
    .single();

  if (error || !order) {
    throw new Error(error?.message ?? "Could not create order");
  }

  const { error: itemError } = await supabase.from("order_items").insert({
    order_id: order.id,
    product_id: input.resolved.productId,
    event_id: input.resolved.eventId,
    tour_id: input.resolved.tourId,
    quantity,
    unit_price_cents: input.resolved.pricing.unitAmountCents,
  });

  if (itemError) {
    throw new Error(itemError.message);
  }

  return order.id as string;
}

function bodyQuantity(body: CheckoutBody) {
  if (body.type === "ticket") return 1;
  return body.quantity ?? 1;
}

export async function attachStripeSessionToOrder(
  supabase: SupabaseClient,
  orderId: string,
  sessionId: string
) {
  const { error } = await supabase
    .from("orders")
    .update({ stripe_checkout_session_id: sessionId })
    .eq("id", orderId);

  if (error) {
    throw new Error(`Could not attach checkout session: ${error.message}`);
  }
}
