import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { unstable_cache } from "next/cache";
import { venueSlugTag } from "@/lib/cache/venue-tags";
import { getVenueBySlug } from "@/lib/data/venues";
import {
  resolveVenueActiveTheme,
  type VenueActiveTheme,
  type VenueThemeChip,
  themeToChip,
} from "@/lib/venues/theme";

async function getClient() {
  if (!isSupabaseConfigured()) return null;
  return createClient();
}

export async function getActiveVenueThemeByVenueId(venueId: string): Promise<VenueActiveTheme | null> {
  if (!isSupabaseConfigured()) return null;
  return cachedActiveThemeByVenueId(venueId);
}

async function fetchActiveVenueThemeByVenueId(venueId: string): Promise<VenueActiveTheme | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const now = new Date().toISOString();

  const { data: assignment } = await supabase
    .from("venue_theme_assignments")
    .select("venue_themes(slug, name, description, assets, default_palette)")
    .eq("venue_id", venueId)
    .eq("is_active", true)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const themeRaw = assignment?.venue_themes;
  const theme = Array.isArray(themeRaw) ? themeRaw[0] : themeRaw;
  if (!theme) return null;

  return resolveVenueActiveTheme(theme as Parameters<typeof resolveVenueActiveTheme>[0]);
}

function cachedActiveThemeByVenueId(venueId: string) {
  return unstable_cache(
    async () => fetchActiveVenueThemeByVenueId(venueId),
    ["venue-active-theme", venueId],
    { tags: [`venue-theme:${venueId}`], revalidate: 120 }
  )();
}

export async function getActiveVenueTheme(slug: string): Promise<VenueActiveTheme | null> {
  const venue = await getVenueBySlug(slug);
  if (!venue) return null;
  const theme = await getActiveVenueThemeByVenueId(venue.id);
  return theme;
}

export async function getActiveThemeChipsForVenues(
  venueIds: string[]
): Promise<Map<string, VenueThemeChip>> {
  const map = new Map<string, VenueThemeChip>();
  if (!venueIds.length) return map;

  const supabase = await getClient();
  if (!supabase) return map;

  const now = new Date().toISOString();

  const { data: rows } = await supabase
    .from("venue_theme_assignments")
    .select("venue_id, venue_themes(slug, name, description, assets, default_palette)")
    .in("venue_id", venueIds)
    .eq("is_active", true)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`);

  for (const row of rows ?? []) {
    const themeRaw = row.venue_themes;
    const themeRow = Array.isArray(themeRaw) ? themeRaw[0] : themeRaw;
    if (!themeRow) continue;
    const resolved = resolveVenueActiveTheme(
      themeRow as Parameters<typeof resolveVenueActiveTheme>[0]
    );
    const chip = themeToChip(resolved);
    if (chip) map.set(row.venue_id as string, chip);
  }

  return map;
}

export type VenueThemeApiPayload = {
  venueId: string;
  slug: string;
  theme: VenueActiveTheme | null;
};

export async function getVenueThemeApiPayload(slug: string): Promise<VenueThemeApiPayload | null> {
  const venue = await getVenueBySlug(slug);
  if (!venue) return null;
  const theme = await getActiveVenueThemeByVenueId(venue.id);
  return { venueId: venue.id, slug: venue.slug, theme };
}
