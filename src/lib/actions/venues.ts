"use server";

import { revalidatePath } from "next/cache";
import { revalidateVenuePublicCache } from "@/lib/cache/revalidate-venue-cache";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

export type VenueFollowResult = { ok: true; following: boolean } | { ok: false; error: string };

export async function toggleFollowVenueAction(venueId: string): Promise<VenueFollowResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to follow venues" };
  if (!isSupabaseConfigured()) return { ok: false, error: "Unavailable" };

  const supabase = await createClient();

  const { data: venue } = await supabase.from("venues").select("slug").eq("id", venueId).maybeSingle();
  if (!venue) return { ok: false, error: "Venue not found" };

  const { data: existing } = await supabase
    .from("venue_followers")
    .select("id")
    .eq("venue_id", venueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("venue_followers").delete().eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    revalidateVenue(venue.slug as string);
    return { ok: true, following: false };
  }

  const { error } = await supabase.from("venue_followers").insert({
    venue_id: venueId,
    user_id: user.id,
  });

  if (error) return { ok: false, error: error.message };

  revalidateVenue(venue.slug as string);
  return { ok: true, following: true };
}

function revalidateVenue(slug: string) {
  revalidateVenuePublicCache(slug);
  revalidatePath(`/livecircuit/venues/${slug}`);
  revalidatePath(`/livecircuit/venues/${slug}/concourse`);
  revalidatePath(`/livecircuit/venues/${slug}/community`);
  revalidatePath("/livecircuit/venues");
}
