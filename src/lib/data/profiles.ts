import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

export async function getProfileForSettings(userId: string) {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return data;
}

export async function isFollowingArtist(fanId: string, artistId: string) {
  if (!isSupabaseConfigured()) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("followers")
    .select("id")
    .eq("fan_id", fanId)
    .eq("artist_id", artistId)
    .maybeSingle();
  return Boolean(data);
}

export async function getFollowingArtists(fanId: string, limit = 12) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("followers")
    .select("artist_id, artists(id, slug, stage_name, banner_url, verified, category)")
    .eq("fan_id", fanId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? [])
    .map((row) => row.artists)
    .flat()
    .filter(Boolean);
}

export async function getUserTickets(userId: string, limit = 10) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("tickets")
    .select("id, tier, price_cents, qr_code, created_at, events(id, slug, title, scheduled_at, artists(slug, stage_name))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getUserOrders(userId: string, limit = 10) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, order_type, status, total_cents, currency, created_at, order_items(quantity, unit_price_cents, events(title), products(name))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getArtistForSettings(userId: string) {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data: artist } = await supabase
    .from("artists")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!artist) return null;

  const { data: genreRows } = await supabase
    .from("artist_genres")
    .select("genre_id")
    .eq("artist_id", artist.id);

  const { data: media } = await supabase
    .from("artist_media")
    .select("*")
    .eq("artist_id", artist.id)
    .order("sort_order", { ascending: true });

  const { data: verification } = await supabase
    .from("verification_requests")
    .select("*")
    .eq("artist_id", artist.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("bio")
    .eq("id", userId)
    .maybeSingle();

  return {
    artist,
    bio: profile?.bio ?? "",
    genreIds: (genreRows ?? []).map((g) => g.genre_id as string),
    media: media ?? [],
    verification,
  };
}
