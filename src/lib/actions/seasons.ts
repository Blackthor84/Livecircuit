"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { equipSeasonProfileFrame } from "@/lib/services/seasons.service";

export async function equipSeasonProfileFrameAction(seasonSlug: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Sign in required" };
  if (!isSupabaseConfigured()) return { ok: true as const, frame: { slug: "demo", label: "Demo", ringClass: "" } };

  const supabase = await createClient();
  const result = await equipSeasonProfileFrame(supabase, user.id, seasonSlug);
  if (result.ok) {
    revalidatePath("/seasons");
    revalidatePath(`/seasons/${seasonSlug}`);
    revalidatePath("/dashboard");
  }
  return result;
}
