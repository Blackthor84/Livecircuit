import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config/env";

export function slugifyTourText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function uniqueTourSlug(title: string) {
  const base = slugifyTourText(title) || "tour";
  const suffix = Date.now().toString(36).slice(-4);
  return `${base}-${suffix}`;
}

function eventSlugForStop(tourSlug: string, stopOrder: number, label: string) {
  const base = slugifyTourText(`${tourSlug}-${stopOrder}-${label}`) || `stop-${stopOrder}`;
  return base.slice(0, 56);
}

export type TourStopRow = {
  id: string;
  tour_id: string;
  city_id: string | null;
  venue_id?: string | null;
  venue_room_label?: string | null;
  virtual_location_label: string;
  stop_order: number;
  scheduled_at: string;
  ticket_price_cents: number;
};

export type TourRow = {
  id: string;
  artist_id: string;
  slug: string;
  title: string;
  status: string;
};

/** Create or update the ticketed event (+ placeholder stream) for a tour stop. */
export async function syncEventForTourStop(
  supabase: SupabaseClient,
  tour: TourRow,
  stop: TourStopRow
) {
  const eventTitle = `${tour.title} — ${stop.virtual_location_label}`;
  let slug = eventSlugForStop(tour.slug, stop.stop_order, stop.virtual_location_label);

  const { data: existing } = await supabase
    .from("events")
    .select("id, slug")
    .eq("tour_stop_id", stop.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("events")
      .update({
        title: eventTitle,
        scheduled_at: stop.scheduled_at,
        status: tour.status === "published" ? "scheduled" : "draft",
        venue_id: stop.venue_id ?? null,
        venue_room_label: stop.venue_room_label ?? null,
      })
      .eq("id", existing.id);
    return existing.id;
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    const { data: inserted, error } = await supabase
      .from("events")
      .insert({
        tour_stop_id: stop.id,
        artist_id: tour.artist_id,
        slug: candidate,
        title: eventTitle,
        status: tour.status === "published" ? "scheduled" : "draft",
        scheduled_at: stop.scheduled_at,
        venue_id: stop.venue_id ?? null,
        venue_room_label: stop.venue_room_label ?? null,
      })
      .select("id")
      .single();

    if (!error && inserted) {
      slug = candidate;
      await ensurePlaceholderStream(inserted.id);
      return inserted.id;
    }

    if (error?.code !== "23505") {
      throw new Error(error?.message ?? "Failed to create event");
    }
  }

  throw new Error("Could not allocate a unique event slug");
}

async function ensurePlaceholderStream(eventId: string) {
  if (!isSupabaseConfigured()) return;

  const admin = getSupabaseAdmin();
  const { data: existing } = await admin
    .from("streams")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle();
  if (existing) return;

  await admin.from("streams").insert({
    event_id: eventId,
    provider: "placeholder",
    status: "idle",
    playback_url: `/api/stream/placeholder/${eventId}`,
  });
}

export async function syncAllStopEvents(
  supabase: SupabaseClient,
  tour: TourRow,
  stops: TourStopRow[]
) {
  for (const stop of stops) {
    await syncEventForTourStop(supabase, tour, stop);
  }
}

export function tourWindowFromStops(stops: { scheduled_at: string }[]) {
  if (!stops.length) return { starts_at: null as string | null, ends_at: null as string | null };
  const times = stops.map((s) => new Date(s.scheduled_at).getTime()).sort((a, b) => a - b);
  return {
    starts_at: new Date(times[0]).toISOString(),
    ends_at: new Date(times[times.length - 1]).toISOString(),
  };
}
