"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config/env";
import { ROUTES } from "@/lib/constants";
import { AWARD_CATEGORIES, type AwardCategory } from "@/lib/constants/awards";
import { castAwardVote } from "@/lib/services/awards.service";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AwardActionResult = { ok: true } | { ok: false; error: string };

const voteSchema = z.object({
  ceremonyId: z.string().uuid(),
  category: z.enum(
    AWARD_CATEGORIES.map((c) => c.value) as [
      (typeof AWARD_CATEGORIES)[number]["value"],
      ...(typeof AWARD_CATEGORIES)[number]["value"][],
    ]
  ),
  nomineeId: z.string().uuid(),
});

export async function castAwardVoteAction(input: unknown): Promise<AwardActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to vote" };
  if (!isSupabaseConfigured()) return { ok: false, error: "Awards require Supabase" };

  const parsed = voteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid vote" };

  const supabase = await createClient();
  const admin = getSupabaseAdmin();
  const result = await castAwardVote(
    supabase,
    admin,
    user.id,
    parsed.data.ceremonyId,
    parsed.data.category as AwardCategory,
    parsed.data.nomineeId
  );
  if (!result.ok) return result;

  revalidatePath(ROUTES.awards);
  revalidatePath(`${ROUTES.awards}/archive`);
  return { ok: true };
}
