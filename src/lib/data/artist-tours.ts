import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import type { Tour, TourStop } from "@/types/database";

export type ArtistTourListItem = Tour & { stop_count: number };

export type TourManagePayload = {
  tour: Tour;
  artistSlug: string;
  stops: (TourStop & {
    cities: { id: string; name: string; slug: string } | null;
    venues: { id: string; slug: string; name: string } | null;
  })[];
};

export async function listArtistTours(artistId: string): Promise<ArtistTourListItem[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data: tours } = await supabase
    .from("tours")
    .select("*, tour_stops(id)")
    .eq("artist_id", artistId)
    .order("updated_at", { ascending: false });

  if (!tours) return [];

  return tours.map((row) => {
    const stopRows = row.tour_stops as { id: string }[] | null;
    const { tour_stops: _ignored, ...tour } = row as Tour & { tour_stops: unknown };
    return { ...(tour as Tour), stop_count: stopRows?.length ?? 0 };
  });
}

export async function listPublishedToursForArtistPublic(artistId: string): Promise<ArtistTourListItem[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data: tours } = await supabase
    .from("tours")
    .select("*, tour_stops(id)")
    .eq("artist_id", artistId)
    .eq("status", "published")
    .order("starts_at", { ascending: false });

  if (!tours) return [];

  return tours.map((row) => {
    const stopRows = row.tour_stops as { id: string }[] | null;
    const { tour_stops: _ignored, ...tour } = row as Tour & { tour_stops: unknown };
    return { ...(tour as Tour), stop_count: stopRows?.length ?? 0 };
  });
}

export async function getTourForArtistManage(
  userId: string,
  tourId: string
): Promise<TourManagePayload | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data: artist } = await supabase
    .from("artists")
    .select("id, slug")
    .eq("user_id", userId)
    .maybeSingle();
  if (!artist) return null;

  const { data: tour } = await supabase
    .from("tours")
    .select("*")
    .eq("id", tourId)
    .eq("artist_id", artist.id)
    .maybeSingle();
  if (!tour) return null;

  const { data: stops } = await supabase
    .from("tour_stops")
    .select("*, cities(id, name, slug), venues(id, slug, name)")
    .eq("tour_id", tour.id)
    .order("stop_order", { ascending: true });

  return {
    tour: tour as Tour,
    artistSlug: artist.slug,
    stops: (stops ?? []) as TourManagePayload["stops"],
  };
}
