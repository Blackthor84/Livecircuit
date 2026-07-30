import type { SupabaseClient } from "@supabase/supabase-js";
import { profileMatchesStop } from "@/lib/virtual-touring/location";

function first<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function recordVirtualTouringViewerJoin(
  admin: SupabaseClient,
  userId: string,
  eventId: string
) {
  const { data: event } = await admin
    .from("events")
    .select("artist_id, tour_city, tour_state_code, tour_stops(tour_id)")
    .eq("id", eventId)
    .maybeSingle();

  if (!event?.artist_id) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("cities(name), states(code), countries(code)")
    .eq("id", userId)
    .maybeSingle();

  const city = first(profile?.cities as { name: string } | { name: string }[] | null);
  const state = first(profile?.states as { code: string } | { code: string }[] | null);
  const country = first(profile?.countries as { code: string } | { code: string }[] | null);

  const isLocal = profileMatchesStop(
    {
      cityName: city?.name ?? null,
      stateCode: state?.code ?? null,
      countryCode: country?.code ?? null,
    },
    {
      tourCity: (event.tour_city as string) ?? null,
      tourStateCode: (event.tour_state_code as string) ?? null,
      tourStateName: null,
    }
  );

  const today = new Date().toISOString().slice(0, 10);
  const stop = first(event.tour_stops as { tour_id: string } | { tour_id: string }[] | null);

  const { data: existing } = await admin
    .from("virtual_touring_analytics_daily")
    .select("id, local_viewers, remote_viewers")
    .eq("event_id", eventId)
    .eq("analytics_date", today)
    .maybeSingle();

  if (existing?.id) {
    await admin
      .from("virtual_touring_analytics_daily")
      .update({
        local_viewers: ((existing.local_viewers as number) ?? 0) + (isLocal ? 1 : 0),
        remote_viewers: ((existing.remote_viewers as number) ?? 0) + (isLocal ? 0 : 1),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return;
  }

  await admin.from("virtual_touring_analytics_daily").insert({
    event_id: eventId,
    tour_id: stop?.tour_id ?? null,
    artist_id: event.artist_id,
    analytics_date: today,
    tour_city: (event.tour_city as string) ?? null,
    tour_state_code: (event.tour_state_code as string) ?? null,
    local_viewers: isLocal ? 1 : 0,
    remote_viewers: isLocal ? 0 : 1,
  });
}
