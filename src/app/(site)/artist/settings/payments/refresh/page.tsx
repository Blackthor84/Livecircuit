import { redirect } from "next/navigation";
import { requireArtistContext } from "@/lib/auth/artist-context";
import { isStripeConfigured } from "@/lib/config/env";
import { beginArtistConnectOnboarding } from "@/lib/stripe/connect";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** Stripe Account Link refresh URL — generates a fresh onboarding link. */
export default async function ArtistPaymentsRefreshPage() {
  const ctx = await requireArtistContext();
  if (!ctx.ok) redirect("/login?next=/artist/settings");

  if (!isStripeConfigured()) {
    redirect("/artist/settings?payments=unconfigured");
  }

  const admin = getSupabaseAdmin();
  const { url } = await beginArtistConnectOnboarding({
    supabase: admin,
    artistId: ctx.artist.id,
    email: ctx.user.email ?? "",
    displayName: ctx.artist.stage_name,
    mode: "onboarding",
  });

  redirect(url);
}
