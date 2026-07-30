"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function joinTourCommunityAction(input: {
  communityId: string;
}): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured" };

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const supabase = await createClient();

  const { data: community } = await supabase
    .from("tour_stop_communities")
    .select("id, slug, member_count")
    .eq("id", input.communityId)
    .maybeSingle();

  if (!community) return { ok: false, error: "Community not found" };

  const { error } = await supabase.from("tour_stop_community_members").upsert(
    { community_id: input.communityId, user_id: user.id },
    { onConflict: "community_id,user_id", ignoreDuplicates: true }
  );

  if (error) return { ok: false, error: error.message };

  await supabase
    .from("tour_stop_communities")
    .update({ member_count: ((community.member_count as number) ?? 0) + 1 })
    .eq("id", input.communityId);

  revalidatePath("/discover");
  return { ok: true };
}
