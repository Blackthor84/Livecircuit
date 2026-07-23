"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { awardVenueLoyaltyPoints } from "@/lib/services/venue-loyalty.service";

const adjustSchema = z.object({
  venueId: z.string().uuid(),
  userId: z.string().uuid(),
  deltaPoints: z.coerce.number().int().min(-10_000).max(10_000),
  note: z.string().max(500).optional(),
});

export type VenueLoyaltyAdminResult = { ok: true } | { ok: false; error: string };

export async function adminAdjustVenueLoyaltyAction(input: unknown): Promise<VenueLoyaltyAdminResult> {
  const profile = await requireRole(["admin"]);
  if (!profile) return { ok: false, error: "Admin access required" };
  if (!isSupabaseConfigured()) return { ok: false, error: "Unavailable" };

  const parsed = adjustSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const supabase = await createClient();
  const { data: venue } = await supabase
    .from("venues")
    .select("slug")
    .eq("id", parsed.data.venueId)
    .maybeSingle();

  const result = await awardVenueLoyaltyPoints({
    venueId: parsed.data.venueId,
    userId: parsed.data.userId,
    reason: "admin_adjustment",
    deltaPoints: parsed.data.deltaPoints,
    metadata: parsed.data.note ? { note: parsed.data.note } : {},
  });

  if (!result.ok) return { ok: false, error: result.error };

  if (venue?.slug) {
    revalidatePath(`/livecircuit/venues/${venue.slug}/loyalty`);
    revalidatePath(`/livecircuit/venues/${venue.slug}/community`);
  }

  return { ok: true };
}
