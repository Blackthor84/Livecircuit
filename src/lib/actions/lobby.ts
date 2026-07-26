"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { isAdminRole } from "@/lib/auth/roles";
import { getEventPublicPath } from "@/lib/services/events.service";
import {
  setManualRecordingUrl,
  updateStreamLobbySettings,
} from "@/lib/services/recordings.service";
import { publicRecordingUrl } from "@/lib/streaming/stream-metadata";

export type LobbyActionResult = { ok: true } | { ok: false; error: string };

const lobbySchema = z.object({
  eventId: z.string().uuid(),
  lobbyMessage: z.string().max(500).optional(),
  lobbyVideoUrl: z.string().url().optional().or(z.literal("")),
  lobbyBannerUrl: z.string().url().optional().or(z.literal("")),
});

const replaySchema = z.object({
  eventId: z.string().uuid(),
  storagePath: z.string().min(3),
});

async function requireOwnedEvent(eventId: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Sign in required" };
  if (!isSupabaseConfigured()) return { ok: false as const, error: "Supabase required" };

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, slug, artists(user_id, slug)")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) return { ok: false as const, error: "Event not found" };

  const artists = event.artists as { user_id: string; slug: string } | { user_id: string; slug: string }[] | null;
  const artist = Array.isArray(artists) ? artists[0] : artists;
  if (!artist || (artist.user_id !== user.id)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (!isAdminRole(profile?.role)) {
      return { ok: false as const, error: "Not allowed" };
    }
  }

  return { ok: true as const, supabase, event, artistSlug: artist?.slug ?? "" };
}

export async function updateEventLobbyAction(input: unknown): Promise<LobbyActionResult> {
  const parsed = lobbySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid lobby settings" };

  const ctx = await requireOwnedEvent(parsed.data.eventId);
  if (!ctx.ok) return ctx;

  await updateStreamLobbySettings(ctx.supabase, parsed.data.eventId, {
    lobbyMessage: parsed.data.lobbyMessage?.trim() || null,
    lobbyVideoUrl: parsed.data.lobbyVideoUrl?.trim() || null,
    lobbyBannerUrl: parsed.data.lobbyBannerUrl?.trim() || null,
  });

  const liveUrl = await getEventPublicPath(ctx.supabase, parsed.data.eventId);
  revalidatePath(`/artist/events/${parsed.data.eventId}`);
  if (liveUrl) revalidatePath(liveUrl);
  return { ok: true };
}

export async function attachEventReplayAction(input: unknown): Promise<LobbyActionResult> {
  const parsed = replaySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid replay upload" };

  const ctx = await requireOwnedEvent(parsed.data.eventId);
  if (!ctx.ok) return ctx;

  const recordingUrl = publicRecordingUrl(parsed.data.storagePath);
  await setManualRecordingUrl(ctx.supabase, parsed.data.eventId, recordingUrl);

  const liveUrl = await getEventPublicPath(ctx.supabase, parsed.data.eventId);
  revalidatePath(`/artist/events/${parsed.data.eventId}`);
  if (liveUrl) revalidatePath(liveUrl);
  return { ok: true };
}
