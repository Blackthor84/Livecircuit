"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  updateAvatarUrlSchema,
  updateProfileSchema,
} from "@/lib/validations/profile";
import { checkUsernameAvailability, syncArtistSlugForUsername } from "@/lib/actions/username";
import { artistProfileUrl, normalizeUsername } from "@/lib/username";

export type ProfileActionResult = { ok: true } | { ok: false; error: string };

export async function updateProfileAction(input: unknown): Promise<ProfileActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid profile" };
  }

  const d = parsed.data;
  const supabase = await createClient();

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const nextUsername = d.username ? normalizeUsername(d.username) : null;
  if (nextUsername) {
    const availability = await checkUsernameAvailability(nextUsername, user.id);
    if (!availability.available) {
      return { ok: false, error: availability.reason ?? "Username unavailable" };
    }
  }

  const uuid = (value?: string | null) =>
    value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
      ? value
      : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: d.displayName,
      username: nextUsername,
      bio: d.bio ?? null,
      country_id: uuid(d.countryId),
      state_id: uuid(d.stateId),
      city_id: uuid(d.cityId),
      favorite_genres: (d.favoriteGenreIds ?? []).filter((id) => uuid(id)) ?? [],
      email_notifications: d.emailNotifications,
      push_notifications: d.pushNotifications,
      onboarding_completed: true,
    })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };

  if (nextUsername) {
    await syncArtistSlugForUsername(user.id, nextUsername, currentProfile?.username);
    revalidatePath(artistProfileUrl(nextUsername));
  }
  if (currentProfile?.username && currentProfile.username !== nextUsername) {
    revalidatePath(artistProfileUrl(currentProfile.username));
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateAvatarUrlAction(avatarUrl: string): Promise<ProfileActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = updateAvatarUrlSchema.safeParse({ avatarUrl });
  if (!parsed.success) return { ok: false, error: "Invalid image URL" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: parsed.data.avatarUrl })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}
