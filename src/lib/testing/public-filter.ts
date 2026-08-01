import type { SupabaseClient } from "@supabase/supabase-js";

/** Inner join select for artist queries that must exclude test account owners. */
export const PUBLIC_ARTIST_PROFILE_SELECT =
  "*, profiles!inner(display_name, avatar_url, bio, username, is_test_account)";

export const PUBLIC_ARTIST_LIST_SELECT =
  "*, profiles!inner(display_name, avatar_url, username, is_test_account)";

export const PUBLIC_ARTIST_EVENT_SELECT = `
  *, artists!inner(slug, stage_name, banner_url, verified, profiles!inner(is_test_account)),
  tour_stops(
    virtual_location_label, ticket_price_cents, banner_url, tour_city, tour_state_code, stop_order,
    tours(id, title, slug)
  )
`;

export const PUBLIC_TOUR_SELECT =
  "*, artists!inner(slug, stage_name, banner_url, profiles!inner(is_test_account))";

export const PUBLIC_DISCOVERY_EVENT_SELECT = `
  id, slug, title, scheduled_at, status,
  tour_city, tour_state_code, tour_state_name, audience_mode,
  artists!inner(slug, stage_name, profiles!inner(is_test_account)),
  tour_stops(ticket_price_cents, tours(title)),
  venues(name)
`;

export function isPublicProfile(profile: { is_test_account?: boolean } | null | undefined): boolean {
  return !profile?.is_test_account;
}

export function filterRowsByPublicProfile<
  T extends { profiles?: { is_test_account?: boolean } | { is_test_account?: boolean }[] | null },
>(rows: T[]): T[] {
  return rows.filter((row) => {
    const profile = row.profiles;
    if (Array.isArray(profile)) return profile.every((p) => isPublicProfile(p));
    return isPublicProfile(profile ?? undefined);
  });
}

export async function getPublicArtistUserIds(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Set<string>> {
  if (!userIds.length) return new Set();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .in("id", userIds)
    .eq("is_test_account", false);
  return new Set((data ?? []).map((row) => row.id as string));
}

export async function getPublicArtistIds(
  supabase: SupabaseClient,
  artistIds: string[]
): Promise<Set<string>> {
  if (!artistIds.length) return new Set();
  const { data } = await supabase
    .from("artists")
    .select("id, profiles!inner(is_test_account)")
    .in("id", artistIds)
    .eq("profiles.is_test_account", false);
  return new Set((data ?? []).map((row) => row.id as string));
}

export async function isPublicArtistUser(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("is_test_account")
    .eq("id", userId)
    .maybeSingle();
  return isPublicProfile(data ?? undefined);
}

export async function isPublicArtistBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<boolean> {
  const { data } = await supabase
    .from("artists")
    .select("id, profiles!inner(is_test_account)")
    .eq("slug", slug)
    .eq("profiles.is_test_account", false)
    .maybeSingle();
  return Boolean(data);
}

export async function countPublicArtists(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase
    .from("artists")
    .select("id, profiles!inner(is_test_account)", { count: "exact", head: true })
    .eq("profiles.is_test_account", false);
  return count ?? 0;
}
