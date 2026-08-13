import "server-only";

import { getProfile, getSessionUser } from "@/lib/auth/session";
import { isArtistOrAdminRole } from "@/lib/auth/roles";
import { isSupabaseConfigured } from "@/lib/config/env";
import { createClient } from "@/lib/supabase/server";

export type ArtistContextResult =
  | { ok: false; error: string; status: number }
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createClient>>;
      user: { id: string; email?: string | null };
      artist: { id: string; slug: string; stage_name: string; user_id: string };
    };

/** Resolve the authenticated user's artist profile — never trust artist_id from the client. */
export async function requireArtistContext(): Promise<ArtistContextResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required", status: 401 };

  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured", status: 503 };
  }

  const profile = await getProfile();
  if (!profile || !isArtistOrAdminRole(profile.role)) {
    return { ok: false, error: "Artist access required", status: 403 };
  }

  const supabase = await createClient();
  const { data: artist } = await supabase
    .from("artists")
    .select("id, slug, stage_name, user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!artist) {
    return { ok: false, error: "Complete your artist profile first", status: 404 };
  }

  return {
    ok: true,
    supabase,
    user: { id: user.id, email: user.email },
    artist: {
      id: artist.id as string,
      slug: artist.slug as string,
      stage_name: artist.stage_name as string,
      user_id: artist.user_id as string,
    },
  };
}
