"use server";

import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { recordVenueTvProgramView } from "@/lib/services/venue-tv.service";
import { z } from "zod";

const viewSchema = z.object({ programId: z.string().uuid() });

export async function recordVenueTvViewAction(input: unknown) {
  if (!isSupabaseConfigured()) return { ok: true as const };
  const parsed = viewSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid program" };

  const user = await getSessionUser();
  const supabase = await createClient();
  await recordVenueTvProgramView(supabase, parsed.data.programId, user?.id ?? null);
  return { ok: true as const };
}
