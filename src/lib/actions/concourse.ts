"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { awardVenueLoyaltyPoints } from "@/lib/services/venue-loyalty.service";
import { recordVenueVisit } from "@/lib/services/venue-collection.service";
import { z } from "zod";

const checkInSchema = z.object({
  venueId: z.string().uuid(),
  eventId: z.string().uuid().optional().nullable(),
  concourseShopId: z.string().uuid().optional().nullable(),
});

export type ConcourseActionResult = { ok: true } | { ok: false; error: string };

export async function recordConcourseCheckInAction(input: unknown): Promise<ConcourseActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to check in" };
  if (!isSupabaseConfigured()) return { ok: false, error: "Unavailable" };

  const parsed = checkInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();

  const { data: venue } = await supabase
    .from("venues")
    .select("slug")
    .eq("id", parsed.data.venueId)
    .maybeSingle();

  const { error } = await supabase.from("venue_check_ins").insert({
    venue_id: parsed.data.venueId,
    user_id: user.id,
    event_id: parsed.data.eventId ?? null,
    concourse_shop_id: parsed.data.concourseShopId ?? null,
  });

  if (error) return { ok: false, error: error.message };

  await recordVenueVisit(supabase, user.id, parsed.data.venueId).catch(() => undefined);

  await awardVenueLoyaltyPoints({
    venueId: parsed.data.venueId,
    userId: user.id,
    reason: "check_in",
    oncePerDay: true,
    referenceType: "venue_check_in",
    referenceId: parsed.data.eventId ?? undefined,
  }).catch(() => undefined);

  if (venue?.slug) {
    revalidatePath(`/livecircuit/venues/${venue.slug}/concourse`);
    revalidatePath(`/livecircuit/venues/${venue.slug}/loyalty`);
    revalidatePath(`/livecircuit/venues/${venue.slug}/community`);
    revalidatePath("/collections/venues");
  }

  return { ok: true };
}

export async function trackConcourseAdClickAction(input: {
  advertisementId: string;
  billboardId?: string;
  venueId?: string;
}): Promise<ConcourseActionResult> {
  const user = await getSessionUser();
  if (!isSupabaseConfigured()) return { ok: false, error: "Unavailable" };

  const supabase = await createClient();
  const { error } = await supabase.from("advertisement_clicks").insert({
    advertisement_id: input.advertisementId,
    billboard_id: input.billboardId ?? null,
    venue_id: input.venueId ?? null,
    user_id: user?.id ?? null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
