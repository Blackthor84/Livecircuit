import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isAchievementEarned,
  metricValue,
  resolveTarget,
} from "@/lib/services/fan-passport-achievements";
import type {
  FanPassportAchievementDef,
  FanPassportAchievementProgress,
  FanPassportProgress,
  FanPassportStamp,
} from "@/lib/types/fan-passport";

type EventRow = {
  id: string;
  title: string;
  scheduled_at: string;
  status: string;
  ended_at?: string | null;
  artist_id: string;
  venue_id?: string | null;
  artists:
    | { stage_name: string; category: string }
    | { stage_name: string; category: string }[]
    | null;
  tour_stops:
    | {
        virtual_location_label: string;
        has_meet_greet: boolean;
        cities:
          | {
              name: string;
              states: { code: string } | { code: string }[] | null;
              countries: { code: string; name: string } | { code: string; name: string }[] | null;
            }
          | {
              name: string;
              states: { code: string } | { code: string }[] | null;
              countries: { code: string; name: string } | { code: string; name: string }[] | null;
            }[]
          | null;
      }
    | {
        virtual_location_label: string;
        has_meet_greet: boolean;
        cities:
          | {
              name: string;
              states: { code: string } | { code: string }[] | null;
              countries: { code: string; name: string } | { code: string; name: string }[] | null;
            }
          | {
              name: string;
              states: { code: string } | { code: string }[] | null;
              countries: { code: string; name: string } | { code: string; name: string }[] | null;
            }[]
          | null;
      }[]
    | null;
  venues:
    | {
        name: string;
        state_code: string | null;
        cities: { name: string } | { name: string }[] | null;
        countries: { code: string; name: string } | { code: string; name: string }[] | null;
        states: { code: string } | { code: string }[] | null;
      }
    | {
        name: string;
        state_code: string | null;
        cities: { name: string } | { name: string }[] | null;
        countries: { code: string; name: string } | { code: string; name: string }[] | null;
        states: { code: string } | { code: string }[] | null;
      }[]
    | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function passportNumberForUser(userId: string) {
  return `LC-${userId.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

function ticketEligible(checkedInAt: string | null, event: EventRow) {
  if (checkedInAt) return true;
  if (event.status === "ended") return true;
  if (event.status === "live") return true;
  if (event.status === "cancelled") return false;
  const at = new Date(event.scheduled_at).getTime();
  return at < Date.now() - 2 * 60 * 60 * 1000;
}

function locationFromEvent(event: EventRow) {
  const venue = first(event.venues);
  const stop = first(event.tour_stops);
  const cityFromStop = first(stop?.cities ?? null);
  const countryFromStop = first(cityFromStop?.countries ?? null);
  const stateFromStop = first(cityFromStop?.states ?? null);
  const venueCity = first(venue?.cities ?? null);
  const venueCountry = first(venue?.countries ?? null);
  const venueState = first(venue?.states ?? null);

  return {
    venueId: event.venue_id ?? null,
    venueName: venue?.name ?? null,
    cityName: venueCity?.name ?? cityFromStop?.name ?? stop?.virtual_location_label ?? null,
    stateCode: venue?.state_code ?? venueState?.code ?? stateFromStop?.code ?? null,
    countryCode: venueCountry?.code ?? countryFromStop?.code ?? null,
    countryName: venueCountry?.name ?? countryFromStop?.name ?? null,
  };
}

function isSpecialEvent(event: EventRow) {
  const stop = first(event.tour_stops);
  const title = event.title.toLowerCase();
  return Boolean(stop?.has_meet_greet) || title.includes("festival") || title.includes("special");
}

export async function ensureFanPassport(supabase: SupabaseClient, userId: string) {
  const number = passportNumberForUser(userId);
  const { data: existing } = await supabase
    .from("fan_passports")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return number;

  await supabase.from("fan_passports").insert({
    user_id: userId,
    passport_number: number,
  });

  return number;
}

export async function syncFanPassportStamps(supabase: SupabaseClient, userId: string) {
  await ensureFanPassport(supabase, userId);

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, tier, checked_in_at, event_id")
    .eq("user_id", userId);

  if (!tickets?.length) return;

  const eventIds = [...new Set(tickets.map((t) => t.event_id as string))];
  const { data: events } = await supabase
    .from("events")
    .select(
      `id, title, scheduled_at, status, ended_at, artist_id, venue_id,
      artists(stage_name, category),
      tour_stops(virtual_location_label, has_meet_greet, cities(name, states(code), countries(code, name))),
      venues(name, state_code, cities(name), countries(code, name), states(code))`
    )
    .in("id", eventIds);

  const eventMap = new Map((events ?? []).map((e) => [e.id as string, e as EventRow]));

  const { data: existingStamps } = await supabase
    .from("fan_passport_stamps")
    .select("event_id")
    .eq("user_id", userId);

  const stamped = new Set((existingStamps ?? []).map((s) => s.event_id as string));

  const rows = [];
  for (const ticket of tickets) {
    const event = eventMap.get(ticket.event_id as string);
    if (!event || stamped.has(event.id)) continue;
    if (!ticketEligible(ticket.checked_in_at as string | null, event)) continue;

    const artist = first(event.artists);
    const loc = locationFromEvent(event);
    const attendedAt =
      (ticket.checked_in_at as string | null) ??
      event.ended_at ??
      event.scheduled_at;

    rows.push({
      user_id: userId,
      event_id: event.id,
      ticket_id: ticket.id,
      venue_id: loc.venueId,
      venue_name: loc.venueName,
      city_name: loc.cityName,
      state_code: loc.stateCode,
      country_code: loc.countryCode,
      country_name: loc.countryName,
      artist_id: event.artist_id,
      artist_name: artist?.stage_name ?? null,
      artist_category: artist?.category ?? null,
      event_title: event.title,
      attended_at: attendedAt,
      is_vip: (ticket.tier as string).toLowerCase() === "vip",
      is_special: isSpecialEvent(event),
    });
  }

  if (rows.length) {
    await supabase.from("fan_passport_stamps").upsert(rows, {
      onConflict: "user_id,event_id",
      ignoreDuplicates: true,
    });
  }
}

export function computeProgressFromStamps(
  stamps: FanPassportStamp[],
  countryTarget: number,
  usStateTarget: number
): FanPassportProgress {
  const countries = new Set(stamps.map((s) => s.countryCode).filter(Boolean));
  const states = new Set(
    stamps.filter((s) => s.countryCode === "US" && s.stateCode).map((s) => s.stateCode as string)
  );

  return {
    stampCount: stamps.length,
    distinctCountries: countries.size,
    distinctUsStates: states.size,
    vipStamps: stamps.filter((s) => s.isVip).length,
    comedyStamps: stamps.filter((s) => s.artistCategory === "comedy").length,
    specialStamps: stamps.filter((s) => s.isSpecial).length,
    countryTarget: Math.max(countryTarget, 1),
    usStateTarget: Math.max(usStateTarget, 1),
  };
}

export async function detectFoundingFan(supabase: SupabaseClient, userId: string, artistIds: string[]) {
  const unique = [...new Set(artistIds.filter(Boolean))];
  for (const artistId of unique.slice(0, 20)) {
    const { data: early } = await supabase
      .from("followers")
      .select("user_id")
      .eq("artist_id", artistId)
      .order("created_at", { ascending: true })
      .limit(100);

    if ((early ?? []).some((f) => f.user_id === userId)) return true;
  }
  return false;
}

export async function syncFanPassportAchievements(
  supabase: SupabaseClient,
  userId: string,
  progress: FanPassportProgress,
  artistIds: string[]
) {
  const foundingFan = await detectFoundingFan(supabase, userId, artistIds);

  const { data: defs } = await supabase
    .from("fan_passport_achievement_defs")
    .select("*")
    .order("sort_order", { ascending: true });

  const { data: earnedRows } = await supabase
    .from("fan_passport_user_achievements")
    .select("achievement_slug, earned_at")
    .eq("user_id", userId);

  const earnedMap = new Map(
    (earnedRows ?? []).map((r) => [r.achievement_slug as string, r.earned_at as string])
  );

  const toInsert: { user_id: string; achievement_slug: string }[] = [];

  for (const row of defs ?? []) {
    const def = {
      slug: row.slug as string,
      name: row.name as string,
      description: row.description as string,
      metric: row.metric as string,
      targetValue: row.target_value as number,
      sortOrder: row.sort_order as number,
    };

    if (earnedMap.has(def.slug)) continue;
    if (!isAchievementEarned(def, progress, foundingFan)) continue;
    toInsert.push({ user_id: userId, achievement_slug: def.slug });
  }

  if (toInsert.length) {
    await supabase.from("fan_passport_user_achievements").insert(toInsert);
    for (const row of toInsert) earnedMap.set(row.achievement_slug, new Date().toISOString());
  }

  return { foundingFan, earnedMap, defs: defs ?? [] };
}

export function mapAchievementProgress(
  defs: Record<string, unknown>[],
  progress: FanPassportProgress,
  foundingFan: boolean,
  earnedMap: Map<string, string>
): FanPassportAchievementProgress[] {
  return defs.map((row) => {
    const def: FanPassportAchievementDef = {
      slug: row.slug as string,
      name: row.name as string,
      description: row.description as string,
      metric: row.metric as string,
      targetValue: row.target_value as number,
      sortOrder: row.sort_order as number,
    };
    const target = resolveTarget(def, progress);
    const current = metricValue(def.metric, progress, foundingFan);
    const earned = earnedMap.has(def.slug) || isAchievementEarned(def, progress, foundingFan);
    return {
      ...def,
      targetValue: target,
      currentValue: Math.min(current, target),
      earned,
      earnedAt: earnedMap.get(def.slug) ?? null,
    };
  });
}

export function mapStampRow(row: Record<string, unknown>): FanPassportStamp {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    venueName: (row.venue_name as string) ?? null,
    cityName: (row.city_name as string) ?? null,
    stateCode: (row.state_code as string) ?? null,
    countryCode: (row.country_code as string) ?? null,
    countryName: (row.country_name as string) ?? null,
    artistName: (row.artist_name as string) ?? null,
    artistCategory: (row.artist_category as string) ?? null,
    eventTitle: row.event_title as string,
    attendedAt: row.attended_at as string,
    isVip: Boolean(row.is_vip),
    isSpecial: Boolean(row.is_special),
  };
}

export async function fetchPassportTargets(supabase: SupabaseClient) {
  const [{ count: countryCount }, { count: stateCount }] = await Promise.all([
    supabase.from("countries").select("*", { count: "exact", head: true }),
    supabase
      .from("states")
      .select("*", { count: "exact", head: true })
      .eq("country_id", (
        await supabase.from("countries").select("id").eq("code", "US").maybeSingle()
      ).data?.id ?? "00000000-0000-0000-0000-000000000000"),
  ]);

  return {
    countryTarget: countryCount ?? 1,
    usStateTarget: stateCount ?? 50,
  };
}

export async function syncPassportStampForTicket(supabase: SupabaseClient, ticketId: string) {
  const { data: ticket } = await supabase
    .from("tickets")
    .select("user_id")
    .eq("id", ticketId)
    .maybeSingle();

  if (!ticket?.user_id) return;
  await syncFanPassportStamps(supabase, ticket.user_id as string);
}
