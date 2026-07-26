import type { SupabaseClient } from "@supabase/supabase-js";
import { syncEventForTourStop, uniqueTourSlug } from "@/lib/services/tours.service";
import { ensureEventStream } from "@/lib/services/streams.service";

export type CreateStandaloneEventInput = {
  title: string;
  virtualLocationLabel: string;
  scheduledAt: string;
  ticketPriceCents: number;
  description?: string | null;
  timezone?: string;
};

export type CreateStandaloneEventResult = {
  tourId: string;
  stopId: string;
  eventId: string;
  eventSlug: string;
};

/** Creates a published single-stop tour and linked event for quick go-live scheduling. */
export async function createStandaloneEvent(
  supabase: SupabaseClient,
  artistId: string,
  input: CreateStandaloneEventInput
): Promise<CreateStandaloneEventResult> {
  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error("Invalid scheduled date");
  }

  const tourSlug = uniqueTourSlug(input.title);
  const { data: tour, error: tourError } = await supabase
    .from("tours")
    .insert({
      artist_id: artistId,
      title: input.title.trim(),
      slug: tourSlug,
      description: input.description?.trim() || null,
      status: "published",
      starts_at: scheduledAt.toISOString(),
      ends_at: scheduledAt.toISOString(),
    })
    .select("id, artist_id, slug, title, status")
    .single();

  if (tourError || !tour) {
    throw new Error(tourError?.message ?? "Failed to create tour");
  }

  const { data: stop, error: stopError } = await supabase
    .from("tour_stops")
    .insert({
      tour_id: tour.id,
      virtual_location_label: input.virtualLocationLabel.trim(),
      stop_order: 0,
      scheduled_at: scheduledAt.toISOString(),
      timezone: input.timezone ?? "UTC",
      ticket_price_cents: input.ticketPriceCents,
      capacity: 1000,
      description: input.description?.trim() || null,
      merch_enabled: true,
    })
    .select(
      "id, tour_id, city_id, venue_id, venue_room_label, virtual_location_label, stop_order, scheduled_at, ticket_price_cents"
    )
    .single();

  if (stopError || !stop) {
    throw new Error(stopError?.message ?? "Failed to create tour stop");
  }

  const eventId = await syncEventForTourStop(supabase, tour, stop);
  await ensureEventStream(eventId);

  const { data: event } = await supabase
    .from("events")
    .select("slug")
    .eq("id", eventId)
    .single();

  if (!event?.slug) {
    throw new Error("Event was created but slug could not be loaded");
  }

  return {
    tourId: tour.id,
    stopId: stop.id,
    eventId,
    eventSlug: event.slug,
  };
}

export async function getEventPublicPath(
  supabase: SupabaseClient,
  eventId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("events")
    .select("slug, artists(slug)")
    .eq("id", eventId)
    .maybeSingle();

  if (!data?.slug) return null;
  const artists = data.artists as { slug: string } | { slug: string }[] | null;
  const artistSlug = Array.isArray(artists) ? artists[0]?.slug : artists?.slug;
  if (!artistSlug) return null;
  return `/artists/${artistSlug}/events/${data.slug}`;
}
