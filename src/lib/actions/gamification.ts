"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config/env";
import { ROUTES } from "@/lib/constants";
import { GAMIFICATION_TITLES } from "@/lib/constants/gamification";
import { equipGamificationTitle } from "@/lib/services/gamification.service";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type GamificationActionResult = { ok: true } | { ok: false; error: string };

const titleSchema = z.object({
  titleSlug: z.enum(GAMIFICATION_TITLES.map((t) => t.slug) as [string, ...string[]]),
});

export async function equipGamificationTitleAction(input: unknown): Promise<GamificationActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };
  if (!isSupabaseConfigured()) return { ok: false, error: "Gamification requires Supabase" };

  const parsed = titleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid title" };

  const admin = getSupabaseAdmin();
  const result = await equipGamificationTitle(admin, user.id, parsed.data.titleSlug);
  if (!result.ok) return result;

  revalidatePath(ROUTES.gamification);
  revalidatePath(ROUTES.dashboard);
  return { ok: true };
}
