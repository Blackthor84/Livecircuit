"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

export type FollowActionResult = { ok: true; following: boolean } | { ok: false; error: string };

export async function toggleFollowArtistAction(artistId: string): Promise<FollowActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to follow artists" };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("followers")
    .select("id")
    .eq("fan_id", user.id)
    .eq("artist_id", artistId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("followers").delete().eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/artists");
    revalidatePath("/dashboard");
    return { ok: true, following: false };
  }

  const { error } = await supabase.from("followers").insert({
    fan_id: user.id,
    artist_id: artistId,
  });

  if (error) return { ok: false, error: error.message };

  const { data: artistRow } = await supabase
    .from("artists")
    .select("user_id, stage_name")
    .eq("id", artistId)
    .maybeSingle();

  if (artistRow?.user_id) {
    const { createNotification } = await import("@/lib/services/notifications.service");
    await createNotification({
      userId: artistRow.user_id,
      type: "follow",
      title: "New follower",
      body: "Someone just followed you on LiveCircuit.",
      link: "/artist/dashboard",
    });
  }

  revalidatePath("/artists");
  revalidatePath("/dashboard");
  return { ok: true, following: true };
}
