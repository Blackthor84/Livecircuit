"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

export type TourFollowActionResult =
  | { ok: true; following: boolean }
  | { ok: false; error: string };

export async function toggleFollowTourAction(
  tourId: string,
  artistSlug: string,
  tourSlug: string
): Promise<TourFollowActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to follow tours" };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("tour_followers")
    .select("id")
    .eq("fan_id", user.id)
    .eq("tour_id", tourId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("tour_followers").delete().eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/artists/${artistSlug}/tours/${tourSlug}`);
    revalidatePath("/tours");
    return { ok: true, following: false };
  }

  const { error } = await supabase.from("tour_followers").insert({
    fan_id: user.id,
    tour_id: tourId,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/artists/${artistSlug}/tours/${tourSlug}`);
  revalidatePath("/tours");
  return { ok: true, following: true };
}
