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
      .select("title, artist_id, tour_stops(ticket_price_cents, vip_price_cents, virtual_location_label)")
      .eq("id", body.eventId)
      .maybeSingle();

    if (event?.tour_stops) {
      const raw = event.tour_stops as
        | { ticket_price_cents: number; vip_price_cents: number | null; virtual_location_label: string }
        | { ticket_price_cents: number; vip_price_cents: number | null; virtual_location_label: string }[];
      const stop = Array.isArray(raw) ? raw[0] : raw;
      if (stop) {
        const unitAmountCents =
          tier === "vip"
            ? stop.vip_price_cents ?? stop.ticket_price_cents
            : stop.ticket_price_cents;
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
          productId: null,
          tier,
        };
      }
    }
  }

  if (body.type === "ticket" && tourStopId) {
    const { data: stop } = await supabase
      .from("tour_stops")
      .select("ticket_price_cents, vip_price_cents, virtual_location_label, tour_id, tours(artist_id)")
      .eq("id", tourStopId)
      .maybeSingle();
    if (stop) {
      const unitAmountCents =
        tier === "vip" ? stop.vip_price_cents ?? stop.ticket_price_cents : stop.ticket_price_cents;
      const tours = stop.tours as { artist_id: string } | { artist_id: string }[] | null;
      const artistId = Array.isArray(tours) ? tours[0]?.artist_id : tours?.artist_id;
      return {
        pricing: {
          unitAmountCents,
          currency,
          description:
            tier === "vip"
              ? `VIP — ${stop.virtual_location_label}`
              : `Ticket — ${stop.virtual_location_label}`,
        },
        artistId: artistId ?? null,
        eventId,
        tourStopId,
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
        productId: null,
        tier: "general",
        festivalTierId: tier.id as string,
        festivalId: tier.festival_id as string,
      };
    }
  }

  return {
    pricing: { unitAmountCents: 2500, currency, description: `LiveCircuit ${body.type}` },
    artistId: null,
    eventId,
    tourStopId,
    productId,
    tier,
  };
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
      .select("status, tour_stops(capacity, vip_capacity)")
      .eq("id", resolved.eventId)
      .maybeSingle();
    if (!event || event.status === "cancelled" || event.status === "ended") {
      throw new CheckoutValidationError("This event is not available for ticket sales");
    }

    const raw = event.tour_stops as
      | { capacity: number; vip_capacity: number | null }
      | { capacity: number; vip_capacity: number | null }[];
    const stop = Array.isArray(raw) ? raw[0] : raw;
    if (stop) {
      const cap = resolved.tier === "vip" ? stop.vip_capacity ?? stop.capacity : stop.capacity;
      const { count } = await supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("event_id", resolved.eventId)
        .eq("tier", resolved.tier);
      if (typeof count === "number" && count >= cap) {
        throw new CheckoutValidationError("This tier is sold out");
      }
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
  }
) {
  const quantity = bodyQuantity(input.body);
  const lineTotal = input.resolved.pricing.unitAmountCents * quantity;
  const orderType =
    input.body.type === "digital" || input.body.type === "festival" ? "digital" : input.body.type;

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      user_id: input.userId,
      artist_id: input.resolved.artistId,
      order_type: orderType,
      status: "pending",
      subtotal_cents: lineTotal,
      total_cents: lineTotal,
      currency: input.resolved.pricing.currency,
      stripe_checkout_session_id: input.stripeCheckoutSessionId ?? null,
      metadata: {
        event_id: input.resolved.eventId,
        tour_stop_id: input.resolved.tourStopId,
        product_id: input.resolved.productId,
        tier: input.resolved.tier,
        tip_message: input.body.tipMessage ?? null,
        festival_tier_id: input.resolved.festivalTierId ?? input.body.festivalTierId ?? null,
        festival_id: input.resolved.festivalId ?? null,
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
  await supabase.from("orders").update({ stripe_checkout_session_id: sessionId }).eq("id", orderId);
}
