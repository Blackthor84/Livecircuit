import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config/env";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

/** Idempotent artist row for dashboard / tour builder (server-only). */
export async function createArtistForUser(userId: string, stageName: string) {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase
      .from("artists")
      .select("id, slug")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) return existing;

    let slug = slugify(stageName) || "artist";
    let attempt = 0;
    while (attempt < 20) {
      const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
      const { data: taken } = await supabase
        .from("artists")
        .select("id")
        .eq("slug", candidate)
        .maybeSingle();
      if (!taken) {
        slug = candidate;
        break;
      }
      attempt += 1;
    }

    const { data, error } = await supabase
      .from("artists")
      .insert({
        user_id: userId,
        slug,
        stage_name: stageName.trim() || "New Artist",
        category: "music",
      })
      .select("id, slug")
      .single();

    if (error) {
      console.error("[createArtistForUser]", error.message);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
