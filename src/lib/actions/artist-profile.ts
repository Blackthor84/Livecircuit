"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  addArtistMediaSchema,
  updateArtistProfileSchema,
  verificationRequestSchema,
} from "@/lib/validations/profile";

export type ArtistProfileActionResult = { ok: true } | { ok: false; error: string };

async function getOwnedArtistId(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("artists").select("id").eq("user_id", userId).maybeSingle();
  return data?.id ?? null;
}

export async function updateArtistProfileAction(input: unknown): Promise<ArtistProfileActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = updateArtistProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const artistId = await getOwnedArtistId(user.id);
  if (!artistId) return { ok: false, error: "Artist profile not found" };

  const d = parsed.data;
  const supabase = await createClient();

  const socialLinks = {
    website: d.socialWebsite || undefined,
    instagram: d.socialInstagram || undefined,
    twitter: d.socialTwitter || undefined,
    youtube: d.socialYoutube || undefined,
  };

  const donationLinks = d.donationUrl ? { default: d.donationUrl } : {};

  const { error: artistError } = await supabase
    .from("artists")
    .update({
      stage_name: d.stageName,
      category: d.category,
      banner_url: d.bannerUrl ?? null,
      social_links: socialLinks,
      donation_links: donationLinks,
    })
    .eq("id", artistId);

  if (artistError) return { ok: false, error: artistError.message };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ bio: d.bio ?? null })
    .eq("id", user.id);

  if (profileError) return { ok: false, error: profileError.message };

  if (d.genreIds) {
    const uuid = (value: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    const valid = d.genreIds.filter(uuid);
    await supabase.from("artist_genres").delete().eq("artist_id", artistId);
    if (valid.length > 0) {
      await supabase.from("artist_genres").insert(
        valid.map((genre_id) => ({ artist_id: artistId, genre_id }))
      );
    }
  }

  revalidatePath("/artist/settings");
  revalidatePath("/artists");
  return { ok: true };
}

export async function addArtistMediaAction(input: unknown): Promise<ArtistProfileActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = addArtistMediaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid media" };

  const artistId = await getOwnedArtistId(user.id);
  if (!artistId) return { ok: false, error: "Artist profile not found" };

  const supabase = await createClient();
  const { error } = await supabase.from("artist_media").insert({
    artist_id: artistId,
    media_type: parsed.data.mediaType,
    title: parsed.data.title,
    url: parsed.data.url,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/artist/settings");
  return { ok: true };
}

export async function requestVerificationAction(input: unknown): Promise<ArtistProfileActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = verificationRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" };

  const artistId = await getOwnedArtistId(user.id);
  if (!artistId) return { ok: false, error: "Artist profile not found" };

  const supabase = await createClient();
  const { data: pending } = await supabase
    .from("verification_requests")
    .select("id")
    .eq("artist_id", artistId)
    .eq("status", "pending")
    .maybeSingle();

  if (pending) return { ok: false, error: "You already have a pending verification request" };

  const { error } = await supabase.from("verification_requests").insert({
    artist_id: artistId,
    message: parsed.data.message,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/artist/settings");
  return { ok: true };
}

export async function removeArtistMediaAction(mediaId: string): Promise<ArtistProfileActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const artistId = await getOwnedArtistId(user.id);
  if (!artistId) return { ok: false, error: "Artist profile not found" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("artist_media")
    .delete()
    .eq("id", mediaId)
    .eq("artist_id", artistId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/artist/settings");
  return { ok: true };
}
