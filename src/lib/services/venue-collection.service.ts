import type { SupabaseClient } from "@supabase/supabase-js";
import { computeCompletionPercent } from "@/lib/services/venue-collection-progress";
import type {
  VenueCollectionBadge,
  VenueCollectionProgress,
  VenueCollectionReport,
  VenueCollectionVisit,
} from "@/lib/types/venue-collection";

type VenueRow = {
  id: string;
  slug: string;
  name: string;
  region: string;
  state_code: string | null;
  is_hidden: boolean;
  is_seasonal: boolean;
  is_hall_of_fame: boolean;
  countries: { code: string } | { code: string }[] | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function recordVenueVisit(
  supabase: SupabaseClient,
  userId: string,
  venueId: string
) {
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("user_venue_visits")
    .select("visit_count")
    .eq("user_id", userId)
    .eq("venue_id", venueId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("user_venue_visits")
      .update({
        visit_count: (existing.visit_count as number) + 1,
        last_visited_at: now,
      })
      .eq("user_id", userId)
      .eq("venue_id", venueId);
  } else {
    await supabase.from("user_venue_visits").insert({
      user_id: userId,
      venue_id: venueId,
      visit_count: 1,
      first_visited_at: now,
      last_visited_at: now,
    });
  }
}

export async function syncUserVenueVisits(supabase: SupabaseClient, userId: string) {
  const counts = new Map<string, { count: number; last: string }>();

  const add = (venueId: string | null | undefined, at?: string) => {
    if (!venueId) return;
    const ts = at ?? new Date().toISOString();
    const cur = counts.get(venueId);
    if (!cur) counts.set(venueId, { count: 1, last: ts });
    else {
      cur.count += 1;
      if (ts > cur.last) cur.last = ts;
    }
  };

  const [{ data: checkIns }, { data: stamps }, { data: tickets }] = await Promise.all([
    supabase.from("venue_check_ins").select("venue_id, created_at").eq("user_id", userId),
    supabase.from("fan_passport_stamps").select("venue_id, attended_at").eq("user_id", userId),
    supabase.from("tickets").select("created_at, events(venue_id)").eq("user_id", userId),
  ]);

  for (const row of checkIns ?? []) add(row.venue_id as string, row.created_at as string);
  for (const row of stamps ?? []) add(row.venue_id as string, row.attended_at as string);
  for (const row of tickets ?? []) {
    const ev = first(row.events as { venue_id: string | null } | { venue_id: string | null }[]);
    add(ev?.venue_id ?? null, row.created_at as string);
  }

  for (const [venueId, meta] of counts) {
    const { data: existing } = await supabase
      .from("user_venue_visits")
      .select("visit_count, first_visited_at")
      .eq("user_id", userId)
      .eq("venue_id", venueId)
      .maybeSingle();

    await supabase.from("user_venue_visits").upsert(
      {
        user_id: userId,
        venue_id: venueId,
        visit_count: Math.max(meta.count, (existing?.visit_count as number) ?? 0),
        first_visited_at: (existing?.first_visited_at as string) ?? meta.last,
        last_visited_at: meta.last,
      },
      { onConflict: "user_id,venue_id" }
    );
  }
}

function mapVisit(
  row: Record<string, unknown>,
  venue: VenueRow,
  favoriteSet: Set<string>
): VenueCollectionVisit {
  const country = first(venue.countries);
  return {
    venueId: venue.id,
    venueSlug: venue.slug,
    venueName: venue.name,
    region: venue.region,
    stateCode: venue.state_code,
    countryCode: country?.code ?? null,
    visitCount: row.visit_count as number,
    lastVisitedAt: row.last_visited_at as string,
    isFavorite: favoriteSet.has(venue.id),
    isHidden: venue.is_hidden,
    isSeasonal: venue.is_seasonal,
    isHallOfFame: venue.is_hall_of_fame,
  };
}

export async function buildVenueCollectionReport(
  supabase: SupabaseClient,
  userId: string
): Promise<VenueCollectionReport> {
  await syncUserVenueVisits(supabase, userId);

  const { data: allVenues } = await supabase
    .from("venues")
    .select(
      "id, slug, name, region, state_code, is_hidden, is_seasonal, is_hall_of_fame, countries(code)"
    )
    .eq("is_active", true);

  const collectibleVenues = (allVenues ?? []).filter((v) => !(v.is_hidden as boolean));
  const hiddenVenues = (allVenues ?? []).filter((v) => v.is_hidden as boolean);
  const seasonalVenues = (allVenues ?? []).filter((v) => v.is_seasonal as boolean);
  const hofVenues = (allVenues ?? []).filter((v) => v.is_hall_of_fame as boolean);

  const { data: visitRows } = await supabase
    .from("user_venue_visits")
    .select("venue_id, visit_count, last_visited_at")
    .eq("user_id", userId);

  const { data: favoriteRows } = await supabase
    .from("venue_followers")
    .select("venue_id")
    .eq("user_id", userId);

  const favoriteSet = new Set((favoriteRows ?? []).map((f) => f.venue_id as string));
  const venueMap = new Map((allVenues ?? []).map((v) => [v.id as string, v as VenueRow]));

  const visits: VenueCollectionVisit[] = [];
  for (const row of visitRows ?? []) {
    const venue = venueMap.get(row.venue_id as string);
    if (!venue) continue;
    visits.push(mapVisit(row as Record<string, unknown>, venue, favoriteSet));
  }

  visits.sort((a, b) => b.visitCount - a.visitCount || b.lastVisitedAt.localeCompare(a.lastVisitedAt));

  const favorites = visits.filter((v) => v.isFavorite);
  const mostAttended = visits[0] ?? null;

  const statesAll = new Set(
    collectibleVenues.map((v) => v.state_code as string).filter(Boolean)
  );
  const statesVisited = new Set(
    visits.map((v) => v.stateCode).filter(Boolean) as string[]
  );
  const countriesAll = new Set<string>();
  const countriesVisited = new Set<string>();
  for (const v of collectibleVenues) {
    const c = first((v as VenueRow).countries);
    if (c?.code) countriesAll.add(c.code);
  }
  for (const v of visits) {
    if (v.countryCode) countriesVisited.add(v.countryCode);
  }

  const progress: VenueCollectionProgress = {
    visitedCount: visits.length,
    totalCollectible: collectibleVenues.length,
    completionPercent: computeCompletionPercent(visits.length, collectibleVenues.length),
    favoriteCount: favorites.length,
    statesVisited: statesVisited.size,
    statesTotal: statesAll.size,
    countriesVisited: countriesVisited.size,
    countriesTotal: countriesAll.size,
    badgeCount: 0,
    hiddenDiscovered: visits.filter((v) => v.isHidden).length,
    hiddenTotal: hiddenVenues.length,
    seasonalVisited: visits.filter((v) => v.isSeasonal).length,
    seasonalTotal: seasonalVenues.length,
    hallOfFameVisited: visits.filter((v) => v.isHallOfFame).length,
    hallOfFameTotal: hofVenues.length,
  };

  const { data: badgeRows } = await supabase
    .from("user_venue_badges")
    .select("id, earned_at, venue_badges(name, description, venues(name))")
    .eq("user_id", userId)
    .order("earned_at", { ascending: false })
    .limit(30);

  const badges: VenueCollectionBadge[] = (badgeRows ?? []).map((b) => {
    const badge = first(
      b.venue_badges as
        | { name: string; description: string | null; venues: { name: string } | { name: string }[] | null }
        | { name: string; description: string | null; venues: { name: string } | { name: string }[] | null }[]
    );
    const venueMeta = badge?.venues ? first(badge.venues) : null;
    return {
      id: b.id as string,
      name: badge?.name ?? "Venue badge",
      description: badge?.description ?? null,
      venueName: venueMeta?.name ?? null,
      earnedAt: b.earned_at as string,
    };
  });

  progress.badgeCount = badges.length;

  return {
    userId,
    mostAttended,
    progress,
    visits,
    favorites,
    badges,
    computedAt: new Date().toISOString(),
  };
}
