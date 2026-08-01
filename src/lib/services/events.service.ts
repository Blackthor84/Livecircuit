import type { SupabaseClient } from "@supabase/supabase-js";
import { syncEventForTourStop, tourWindowFromStops, uniqueTourSlug } from "@/lib/services/tours.service";
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
  tourId?: string | null;
};

export type CreateStandaloneEventResult = {
  tourId: string;
  stopId: string;
  eventId: string;
  eventSlug: string;
  attachedToDraft: boolean;
};

async function findActiveDraftTour(supabase: SupabaseClient, artistId: string) {
  const { data } = await supabase
    .from("tours")
    .select("id, artist_id, slug, title, status")
    .eq("artist_id", artistId)
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function nextStopOrder(supabase: SupabaseClient, tourId: string) {
  const { data: stops } = await supabase
    .from("tour_stops")
    .select("stop_order")
    .eq("tour_id", tourId)
    .order("stop_order", { ascending: false })
    .limit(1);
  return (stops?.[0]?.stop_order ?? -1) + 1;
}

/** Adds a stop to an existing draft tour, or creates a published single-stop tour. */
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

  let tour: { id: string; artist_id: string; slug: string; title: string; status: string };
  let attachedToDraft = false;

  if (input.tourId) {
    const { data: explicitTour } = await supabase
      .from("tours")
      .select("id, artist_id, slug, title, status")
      .eq("id", input.tourId)
      .eq("artist_id", artistId)
      .maybeSingle();
    if (!explicitTour) throw new Error("Tour not found");
    tour = explicitTour;
    attachedToDraft = explicitTour.status === "draft";
  } else {
    const draftTour = await findActiveDraftTour(supabase, artistId);
    if (draftTour) {
      tour = draftTour;
      attachedToDraft = true;
    } else {
      const tourSlug = uniqueTourSlug(input.title);
      const { data: newTour, error: tourError } = await supabase
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

      if (tourError || !newTour) {
        throw new Error(tourError?.message ?? "Failed to create tour");
      }
      tour = newTour;
    }
  }

  const stopOrder = await nextStopOrder(supabase, tour.id);

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
      stop_order: stopOrder,
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

  const { data: allStops } = await supabase
    .from("tour_stops")
    .select("scheduled_at")
    .eq("tour_id", tour.id)
    .order("scheduled_at", { ascending: true });

  const window = tourWindowFromStops(
    (allStops ?? []).map((s) => ({ scheduled_at: s.scheduled_at as string }))
  );
  await supabase
    .from("tours")
    .update({
      starts_at: window.starts_at,
      ends_at: window.ends_at,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tour.id);

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
    attachedToDraft,
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
