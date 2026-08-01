import type { SupabaseClient } from "@supabase/supabase-js";
import { getTourTemplate, type TourTemplateDefinition } from "@/lib/touring/tour-templates";
import { syncEventForTourStop, tourWindowFromStops } from "@/lib/services/tours.service";
import { buildVirtualLocationLabel, stateNameFromCode } from "@/lib/virtual-touring/location";
import type { TourType } from "@/types/database";

type TourRow = {
  id: string;
  artist_id: string;
  slug: string;
  title: string;
  status: string;
};

type CityRow = {
  id: string;
  name: string;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  state_id: string | null;
  country_id: string;
  states: { code: string; name: string } | { code: string; name: string }[] | null;
  countries: { code: string; is_enabled: boolean } | { code: string; is_enabled: boolean }[] | null;
};

async function resolveTemplateCity(
  supabase: SupabaseClient,
  stop: { countryCode: string; citySlug: string }
): Promise<CityRow | null> {
  const { data } = await supabase
    .from("cities")
    .select(
      "id, name, slug, latitude, longitude, state_id, country_id, states(code, name), countries!inner(code, is_enabled)"
    )
    .eq("slug", stop.citySlug)
    .eq("countries.code", stop.countryCode)
    .eq("countries.is_enabled", true)
    .maybeSingle();

  return (data as CityRow | null) ?? null;
}

export async function applyTourTemplateToTour(
  supabase: SupabaseClient,
  tour: TourRow,
  template: TourTemplateDefinition,
  startDate = new Date()
): Promise<{ stopsCreated: number; skipped: number }> {
  let stopOrder = 0;
  let skipped = 0;

  for (let i = 0; i < template.stops.length; i++) {
    const stopDef = template.stops[i];
    const city = await resolveTemplateCity(supabase, stopDef);
    if (!city) {
      skipped += 1;
      continue;
    }

    const stateRaw = city.states;
    const state = Array.isArray(stateRaw) ? stateRaw[0] : stateRaw;
    const stateCode = state?.code ?? null;
    const scheduledAt = new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const locationLabel = buildVirtualLocationLabel(city.name, stateCode);

    const { data: inserted, error } = await supabase
      .from("tour_stops")
      .insert({
        tour_id: tour.id,
        city_id: city.id,
        virtual_location_label: locationLabel,
        tour_city: city.name,
        tour_state_code: stateCode,
        tour_state_name: stateNameFromCode(stateCode),
        stop_order: stopOrder,
        scheduled_at: scheduledAt.toISOString(),
        show_starts_at: scheduledAt.toISOString(),
        doors_open_at: new Date(scheduledAt.getTime() - 30 * 60_000).toISOString(),
        timezone: "UTC",
        ticket_price_cents: template.defaultTicketPriceCents,
        capacity: 1000,
        merch_enabled: true,
      })
      .select(
        "id, tour_id, city_id, venue_id, venue_room_label, virtual_location_label, stop_order, scheduled_at, ticket_price_cents"
      )
      .single();

    if (error || !inserted) {
      skipped += 1;
      continue;
    }

    await syncEventForTourStop(supabase, tour, inserted);
    stopOrder += 1;
  }

  const { data: stops } = await supabase
    .from("tour_stops")
    .select("scheduled_at")
    .eq("tour_id", tour.id);

  const window = tourWindowFromStops(stops ?? []);
  await supabase
    .from("tours")
    .update({
      tour_type: template.tourType,
      starts_at: window.starts_at,
      ends_at: window.ends_at,
    })
    .eq("id", tour.id);

  return { stopsCreated: stopOrder, skipped };
}

export async function applyTourTemplateBySlug(
  supabase: SupabaseClient,
  tour: TourRow,
  templateSlug: string
) {
  const template = getTourTemplate(templateSlug);
  if (!template) throw new Error("Tour template not found");
  return applyTourTemplateToTour(supabase, tour, template);
}

export function inferTourTypeFromStopCount(stopCount: number): TourType {
  if (stopCount <= 1) return "city";
  if (stopCount <= 3) return "state";
  if (stopCount <= 8) return "regional";
  if (stopCount <= 12) return "national";
  if (stopCount <= 20) return "continental";
  return "world";
}
