"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { getArtistForUser } from "@/lib/auth/session";
import {
  refreshCreatorRating,
  upsertCreatorProfileRow,
} from "@/lib/services/marketplace.service";
import {
  bookingMessageSchema,
  completeBookingSchema,
  createBookingSchema,
  marketplaceReviewSchema,
  portfolioItemSchema,
  respondBookingSchema,
  upsertCreatorProfileSchema,
} from "@/lib/validations/marketplace";

export type MarketplaceActionResult = { ok: true; slug?: string } | { ok: false; error: string };

export async function upsertCreatorProfileAction(input: unknown): Promise<MarketplaceActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };
  if (!isSupabaseConfigured()) return { ok: false, error: "Marketplace requires Supabase" };

  const parsed = upsertCreatorProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid profile" };

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const slug = await upsertCreatorProfileRow(supabase, user.id, {
    ...parsed.data,
    displayName: profile?.display_name?.trim() || "Creator",
  });

  revalidatePath("/marketplace/studio");
  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/creators/${slug}`);
  return { ok: true, slug };
}

export async function addPortfolioItemAction(input: unknown): Promise<MarketplaceActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = portfolioItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid portfolio item" };

  const supabase = await createClient();
  const { data: creator } = await supabase
    .from("creator_profiles")
    .select("slug")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!creator) return { ok: false, error: "Create your creator profile first" };

  const { error } = await supabase.from("creator_portfolio_items").insert({
    creator_user_id: user.id,
    title: parsed.data.title,
    description: parsed.data.description ?? "",
    media_url: parsed.data.mediaUrl?.trim() || null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/marketplace/creators/${creator.slug}`);
  revalidatePath("/marketplace/studio");
  return { ok: true, slug: creator.slug as string };
}

export async function createBookingRequestAction(input: unknown): Promise<MarketplaceActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = createBookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid booking request" };

  const artist = await getArtistForUser(user.id);
  if (!artist) return { ok: false, error: "Artist account required to hire creators" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketplace_bookings")
    .insert({
      artist_user_id: user.id,
      creator_user_id: parsed.data.creatorUserId,
      service_category: parsed.data.serviceCategory,
      title: parsed.data.title,
      brief: parsed.data.brief ?? "",
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not create booking" };

  revalidatePath("/marketplace/bookings");
  revalidatePath("/artist/marketplace");
  return { ok: true, slug: data.id as string };
}

export async function respondBookingAction(input: unknown): Promise<MarketplaceActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = respondBookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid response" };

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("marketplace_bookings")
    .select("id, creator_user_id, status, currency")
    .eq("id", parsed.data.bookingId)
    .maybeSingle();

  if (!booking || booking.creator_user_id !== user.id) {
    return { ok: false, error: "Booking not found" };
  }
  if (booking.status !== "pending") return { ok: false, error: "Booking already responded" };

  if (!parsed.data.accept) {
    await supabase
      .from("marketplace_bookings")
      .update({ status: "declined", updated_at: new Date().toISOString() })
      .eq("id", parsed.data.bookingId);
    revalidatePath(`/marketplace/bookings/${parsed.data.bookingId}`);
    return { ok: true };
  }

  const { data: creator } = await supabase
    .from("creator_profiles")
    .select("rate_cents")
    .eq("user_id", user.id)
    .maybeSingle();

  const price = parsed.data.agreedPriceCents ?? (creator?.rate_cents as number) ?? 0;
  if (price <= 0) return { ok: false, error: "Set a price to accept" };

  await supabase
    .from("marketplace_bookings")
    .update({
      status: "awaiting_payment",
      agreed_price_cents: price,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.bookingId);

  revalidatePath(`/marketplace/bookings/${parsed.data.bookingId}`);
  return { ok: true };
}

export async function sendBookingMessageAction(input: unknown): Promise<MarketplaceActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = bookingMessageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid message" };

  const supabase = await createClient();
  const { error } = await supabase.from("marketplace_booking_messages").insert({
    booking_id: parsed.data.bookingId,
    sender_id: user.id,
    body: parsed.data.body,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/marketplace/bookings/${parsed.data.bookingId}`);
  return { ok: true };
}

export async function completeBookingAction(input: unknown): Promise<MarketplaceActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = completeBookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid booking" };

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("marketplace_bookings")
    .select("artist_user_id, creator_user_id, status")
    .eq("id", parsed.data.bookingId)
    .maybeSingle();

  if (!booking) return { ok: false, error: "Not found" };
  const allowed = booking.artist_user_id === user.id || booking.creator_user_id === user.id;
  if (!allowed) return { ok: false, error: "Not allowed" };
  if (booking.status !== "paid") return { ok: false, error: "Booking must be paid first" };

  await supabase
    .from("marketplace_bookings")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.bookingId);

  revalidatePath(`/marketplace/bookings/${parsed.data.bookingId}`);
  return { ok: true };
}

export async function submitMarketplaceReviewAction(input: unknown): Promise<MarketplaceActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = marketplaceReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid review" };

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("marketplace_bookings")
    .select("artist_user_id, creator_user_id, status")
    .eq("id", parsed.data.bookingId)
    .maybeSingle();

  if (!booking || booking.artist_user_id !== user.id) {
    return { ok: false, error: "Only the hiring artist can review" };
  }
  if (booking.status !== "completed") {
    return { ok: false, error: "Complete the booking before reviewing" };
  }

  const { error } = await supabase.from("marketplace_reviews").insert({
    booking_id: parsed.data.bookingId,
    reviewer_id: user.id,
    creator_user_id: booking.creator_user_id,
    rating: parsed.data.rating,
    body: parsed.data.body?.trim() || null,
  });

  if (error) return { ok: false, error: error.message };

  await refreshCreatorRating(supabase, booking.creator_user_id as string);
  revalidatePath(`/marketplace/bookings/${parsed.data.bookingId}`);
  return { ok: true };
}
