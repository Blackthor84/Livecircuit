import type { SupabaseClient } from "@supabase/supabase-js";

export type VenueCapacityCheck = {
  ok: true;
  concurrentEvents: number;
  softLimit: number | null;
} | {
  ok: false;
  error: string;
  concurrentEvents: number;
  softLimit: number;
};

/** Count scheduled + live events at a venue (unlimited by default; soft limit optional). */
export async function countConcurrentVenueEvents(
  supabase: SupabaseClient,
  venueId: string,
  excludeEventId?: string
): Promise<number> {
  let query = supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", venueId)
    .in("status", ["scheduled", "live"]);

  if (excludeEventId) {
    query = query.neq("id", excludeEventId);
  }

  const { count } = await query;
  return count ?? 0;
}

export async function checkVenueSoftCapacity(
  supabase: SupabaseClient,
  venueId: string,
  excludeEventId?: string
): Promise<VenueCapacityCheck> {
  const { data: venue } = await supabase
    .from("venues")
    .select("soft_capacity_limit, is_active")
    .eq("id", venueId)
    .maybeSingle();

  if (!venue) return { ok: false, error: "Venue not found", concurrentEvents: 0, softLimit: 0 };
  if (!venue.is_active) return { ok: false, error: "Venue is not active", concurrentEvents: 0, softLimit: 0 };

  const concurrent = await countConcurrentVenueEvents(supabase, venueId, excludeEventId);
  const softLimit = venue.soft_capacity_limit as number | null;

  if (softLimit != null && concurrent >= softLimit) {
    return {
      ok: false,
      error: `Venue soft limit reached (${softLimit} simultaneous events). Choose another venue or contact admin.`,
      concurrentEvents: concurrent,
      softLimit,
    };
  }

  return { ok: true, concurrentEvents: concurrent, softLimit };
}

export function defaultVenueRoomLabel(input: {
  artistSlug: string;
  tourSlug: string;
  stopOrder: number;
  virtualLocationLabel: string;
}) {
  const base = input.virtualLocationLabel.trim() || `stop-${input.stopOrder + 1}`;
  return `${input.artistSlug}/${input.tourSlug}/${base}`.slice(0, 120);
}

export async function applyVenueToEvent(
  supabase: SupabaseClient,
  eventId: string,
  venueId: string | null,
  venueRoomLabel: string | null,
  options?: { skipCapacityCheck?: boolean; excludeEventId?: string }
) {
  if (venueId && !options?.skipCapacityCheck) {
    const check = await checkVenueSoftCapacity(
      supabase,
      venueId,
      options?.excludeEventId ?? eventId
    );
    if (!check.ok) {
      throw new Error(check.error);
    }
  }

  const { error } = await supabase
    .from("events")
    .update({
      venue_id: venueId,
      venue_room_label: venueRoomLabel,
    })
    .eq("id", eventId);

  if (error) throw new Error(error.message);
}

export async function syncVenueFromStopToEvent(
  supabase: SupabaseClient,
  tourStopId: string,
  venueId: string | null,
  venueRoomLabel: string | null
) {
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("tour_stop_id", tourStopId)
    .maybeSingle();

  if (!event?.id) return;

  await applyVenueToEvent(supabase, event.id as string, venueId, venueRoomLabel, {
    excludeEventId: event.id as string,
  });
}
