import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { createArtistForUser } from "@/lib/services/artists.service";
import { applyPendingReferralAction } from "@/lib/actions/coins";

/** Runs after OAuth, email verify, or password login to sync artist records. */
export async function finalizeAuthSession(userId: string) {
  if (!isSupabaseConfigured()) return;

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role === "artist") {
    await createArtistForUser(userId, profile.display_name ?? "Artist");
  }

  try {
    await applyPendingReferralAction(userId);
  } catch {
    /* referral optional */
  }
}
