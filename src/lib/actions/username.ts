"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { normalizeUsername } from "@/lib/username";

export async function checkUsernameAvailability(username: string, excludeUserId?: string) {
  const normalized = normalizeUsername(username);
  if (!normalized) return { available: false, reason: "Username is required" };

  if (!isSupabaseConfigured()) {
    return { available: true };
  }

  const supabase = await createClient();

  const [profileHit, redirectHit, slugHit] = await Promise.all([
    supabase
      .from("profiles")
      .select("id")
      .eq("username", normalized)
      .maybeSingle(),
    supabase
      .from("username_redirects")
      .select("id")
      .eq("old_username", normalized)
      .maybeSingle(),
    supabase
      .from("artists")
      .select("user_id")
      .eq("slug", normalized)
      .maybeSingle(),
  ]);

  if (profileHit.data && profileHit.data.id !== excludeUserId) {
    return { available: false, reason: "Username is already taken" };
  }
  if (redirectHit.data) {
    return { available: false, reason: "Username is already taken" };
  }
  if (slugHit.data && slugHit.data.user_id !== excludeUserId) {
    return { available: false, reason: "Username is already taken" };
  }

  return { available: true };
}

export async function getUsernameRedirectTarget(username: string): Promise<string | null> {
  const normalized = normalizeUsername(username);
  if (!normalized || !isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data: redirect } = await supabase
    .from("username_redirects")
    .select("user_id")
    .eq("old_username", normalized)
    .maybeSingle();

  if (!redirect) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", redirect.user_id)
    .maybeSingle();

  return profile?.username ?? null;
}

export async function syncArtistSlugForUsername(userId: string, username: string, oldUsername?: string | null) {
  if (!isSupabaseConfigured()) return;

  const normalized = normalizeUsername(username);
  const supabase = await createClient();

  const { data: artist } = await supabase
    .from("artists")
    .select("id, slug")
    .eq("user_id", userId)
    .maybeSingle();

  if (!artist) return;

  if (oldUsername && normalizeUsername(oldUsername) !== normalized) {
    await supabase.from("username_redirects").upsert(
      { old_username: normalizeUsername(oldUsername), user_id: userId },
      { onConflict: "old_username" }
    );
  }

  if (artist.slug !== normalized) {
    await supabase.from("artists").update({ slug: normalized }).eq("id", artist.id);
  }
}
