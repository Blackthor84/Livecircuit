import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

export async function isFollowingTour(fanId: string, tourId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = await createClient();
  const { data } = await supabase
    .from("tour_followers")
    .select("id")
    .eq("fan_id", fanId)
    .eq("tour_id", tourId)
    .maybeSingle();

  return Boolean(data);
}

export async function getTourFollowerCount(tourId: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const supabase = await createClient();
  const { data } = await supabase.from("tours").select("follower_count").eq("id", tourId).maybeSingle();
  return data?.follower_count ?? 0;
}

export async function getTourProducts(tourId: string, limit = 12) {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, slug, name, price_cents, image_urls, active, tour_id")
    .eq("tour_id", tourId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}
