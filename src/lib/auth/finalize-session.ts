import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { createArtistForUser } from "@/lib/services/artists.service";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { applyPendingReferralAction } from "@/lib/actions/coins";

/** Runs after OAuth, email verify, or password login to sync admin + artist records. */
export async function finalizeAuthSession(userId: string) {
  if (!isSupabaseConfigured()) return;

  const supabase = await createClient();

  const { data: adminRow } = await supabase
    .from("admins")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (adminRow) {
    try {
      const admin = getSupabaseAdmin();
      const { data: profile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      // Promote admins table members without downgrading super_admin.
      if (profile?.role === "fan" || profile?.role === "artist") {
        await admin.from("profiles").update({ role: "admin" }).eq("id", userId);
      }
    } catch {
      /* service role optional in local dev */
    }
    try {
      await applyPendingReferralAction(userId);
    } catch {
      /* referral optional */
    }
    return;
  }

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
