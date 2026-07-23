"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { castWalkOfFameVote } from "@/lib/services/walk-of-fame.service";
import { ROUTES } from "@/lib/constants";

export type WalkOfFameActionResult = { ok: true } | { ok: false; error: string };

const voteSchema = z.object({ artistId: z.string().uuid() });

export async function castWalkOfFameVoteAction(input: unknown): Promise<WalkOfFameActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to vote" };
  if (!isSupabaseConfigured()) return { ok: false, error: "Walk of Fame requires Supabase" };

  const parsed = voteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid artist" };

  const supabase = await createClient();
  const admin = getSupabaseAdmin();
  const result = await castWalkOfFameVote(supabase, admin, user.id, parsed.data.artistId);
  if (!result.ok) return result;

  revalidatePath(ROUTES.walkOfFame);
  return { ok: true };
}
