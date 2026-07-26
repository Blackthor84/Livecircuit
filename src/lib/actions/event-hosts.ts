"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { isAdminRole } from "@/lib/auth/roles";
import { getEventPublicPath } from "@/lib/services/events.service";
import {
  addEventCoHost,
  listEventHosts,
  removeEventCoHost,
  resolveProfileByUsername,
} from "@/lib/services/event-hosts.service";
import { createNotification } from "@/lib/services/notifications.service";

export type EventHostActionResult = { ok: true } | { ok: false; error: string };

const inviteSchema = z.object({
  eventId: z.string().uuid(),
  username: z.string().min(2).max(40),
});

const removeSchema = z.object({
  eventId: z.string().uuid(),
  userId: z.string().uuid(),
});

async function requireEventOwner(eventId: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Sign in required" };
  if (!isSupabaseConfigured()) return { ok: false as const, error: "Supabase required" };

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, title, slug, artist_id, artists(user_id, slug)")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) return { ok: false as const, error: "Event not found" };

  const artists = event.artists as { user_id: string; slug: string } | { user_id: string; slug: string }[] | null;
  const artist = Array.isArray(artists) ? artists[0] : artists;
  if (!artist || artist.user_id !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (!isAdminRole(profile?.role)) {
      return { ok: false as const, error: "Only the event owner can manage co-hosts" };
    }
  }

  return { ok: true as const, user, supabase, event, artistSlug: artist?.slug ?? "" };
}

export async function inviteEventCoHostAction(input: unknown): Promise<EventHostActionResult> {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid invite" };

  const ctx = await requireEventOwner(parsed.data.eventId);
  if (!ctx.ok) return ctx;

  const profile = await resolveProfileByUsername(ctx.supabase, parsed.data.username);
  if (!profile) return { ok: false, error: "User not found" };
  if (profile.id === ctx.user.id) return { ok: false, error: "You are already the host" };

  const artists = ctx.event.artists as { user_id: string } | { user_id: string }[] | null;
  const artistUserId = Array.isArray(artists) ? artists[0]?.user_id : artists?.user_id;
  if (profile.id === artistUserId) {
    return { ok: false, error: "The primary artist is already a host" };
  }

  try {
    await addEventCoHost(ctx.supabase, {
      eventId: parsed.data.eventId,
      userId: profile.id,
      invitedBy: ctx.user.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add co-host";
    if (message.includes("duplicate") || message.includes("unique")) {
      return { ok: false, error: "This user is already a co-host" };
    }
    return { ok: false, error: message };
  }

  const liveUrl = await getEventPublicPath(ctx.supabase, parsed.data.eventId);
  if (liveUrl) {
    await createNotification({
      userId: profile.id,
      type: "system",
      title: "You're invited to co-host",
      body: `Join "${ctx.event.title as string}" as a co-host.`,
      link: liveUrl,
      metadata: { event_id: parsed.data.eventId },
    });
  }

  revalidatePath(`/artist/events/${parsed.data.eventId}`);
  if (liveUrl) revalidatePath(liveUrl);
  return { ok: true };
}

export async function removeEventCoHostAction(input: unknown): Promise<EventHostActionResult> {
  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request" };

  const ctx = await requireEventOwner(parsed.data.eventId);
  if (!ctx.ok) return ctx;

  try {
    await removeEventCoHost(ctx.supabase, parsed.data.eventId, parsed.data.userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not remove co-host",
    };
  }

  revalidatePath(`/artist/events/${parsed.data.eventId}`);
  return { ok: true };
}

export async function getEventCoHostsAction(eventId: string) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  return listEventHosts(supabase, eventId);
}
