import type { SupabaseClient } from "@supabase/supabase-js";
import { syncEventForTourStop, uniqueTourSlug } from "@/lib/services/tours.service";
import { ensureEventStream } from "@/lib/services/streams.service";
import { buildVirtualLocationLabel, stateNameFromCode } from "@/lib/virtual-touring/location";
import type { EventAudienceMode } from "@/types/database";

export type CreateStandaloneEventInput = {
  title: string;
  virtualLocationLabel: string;
  tourCity: string;
  tourStateCode?: string | null;
  scheduledAt: string;
  doorsOpenAt?: string | null;
  ticketPriceCents: number;
  description?: string | null;
  timezone?: string;
  audienceMode?: EventAudienceMode;
  localPriorityMinutes?: number;
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

  const doorsOpen = input.doorsOpenAt
    ? new Date(input.doorsOpenAt)
    : new Date(scheduledAt.getTime() - 30 * 60_000);
  const stateCode = input.tourStateCode?.trim().toUpperCase() || null;
  const tourCity = input.tourCity.trim();
  const locationLabel =
    input.virtualLocationLabel.trim() ||
    buildVirtualLocationLabel(tourCity, stateCode);

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
      virtual_location_label: locationLabel,
      tour_city: tourCity,
      tour_state_code: stateCode,
      tour_state_name: stateNameFromCode(stateCode),
      doors_open_at: doorsOpen.toISOString(),
      show_starts_at: scheduledAt.toISOString(),
      audience_mode: input.audienceMode ?? "worldwide",
      local_priority_minutes: input.localPriorityMinutes ?? 30,
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
