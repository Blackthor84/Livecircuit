"use server";

import { revalidatePath } from "next/cache";
import { revalidateVenuePublicCache } from "@/lib/cache/revalidate-venue-cache";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { creditCoinsForReview } from "@/lib/services/coins.service";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  createVenuePostSchema,
  upsertVenueReviewSchema,
} from "@/lib/validations/venue-community";
import { awardVenueLoyaltyPoints, reevaluateVenueLoyaltyBadges } from "@/lib/services/venue-loyalty.service";

export type VenueCommunityActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function revalidateVenueCommunity(slug: string) {
  revalidateVenuePublicCache(slug);
  revalidatePath(`/livecircuit/venues/${slug}`);
  revalidatePath(`/livecircuit/venues/${slug}/community`);
  revalidatePath(`/livecircuit/venues/${slug}/loyalty`);
}

export async function createVenuePostAction(input: unknown): Promise<VenueCommunityActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to post" };
  if (!isSupabaseConfigured()) return { ok: false, error: "Unavailable" };

  const parsed = createVenuePostSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const kind = parsed.data.kind ?? "discussion";
  if (kind !== "discussion") {
    return { ok: false, error: "Only discussion posts can be created here" };
  }

  const supabase = await createClient();
  const { data: venue } = await supabase
    .from("venues")
    .select("slug, is_active")
    .eq("id", parsed.data.venueId)
    .maybeSingle();

  if (!venue?.is_active) return { ok: false, error: "Venue not found" };

  const title = parsed.data.title?.trim() || null;

  const { error } = await supabase.from("venue_posts").insert({
    venue_id: parsed.data.venueId,
    user_id: user.id,
    kind: "discussion",
    title,
    body: parsed.data.body.trim(),
  });

  if (error) return { ok: false, error: error.message };

  await revalidateVenueCommunity(venue.slug as string);
  return { ok: true };
}

export async function upsertVenueReviewAction(input: unknown): Promise<VenueCommunityActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to review" };
  if (!isSupabaseConfigured()) return { ok: false, error: "Unavailable" };

  const parsed = upsertVenueReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data: venue } = await supabase
    .from("venues")
    .select("slug, is_active")
    .eq("id", parsed.data.venueId)
    .maybeSingle();

  if (!venue?.is_active) return { ok: false, error: "Venue not found" };

  const body = parsed.data.body?.trim() || null;

  const { data: existingReview } = await supabase
    .from("venue_reviews")
    .select("id")
    .eq("venue_id", parsed.data.venueId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase.from("venue_reviews").upsert(
    {
      venue_id: parsed.data.venueId,
      user_id: user.id,
      rating: parsed.data.rating,
      body,
    },
    { onConflict: "venue_id,user_id" }
  );

  if (error) return { ok: false, error: error.message };

  if (!existingReview) {
    await awardVenueLoyaltyPoints({
      venueId: parsed.data.venueId,
      userId: user.id,
      reason: "review",
    });
    try {
      await creditCoinsForReview(getSupabaseAdmin(), user.id, parsed.data.venueId);
    } catch {
      /* coins optional */
    }
  } else {
    await reevaluateVenueLoyaltyBadges(parsed.data.venueId, user.id);
  }

  await revalidateVenueCommunity(venue.slug as string);
  return { ok: true };
}
