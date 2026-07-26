"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { createStandaloneEvent } from "@/lib/services/events.service";
import { createEventSchema } from "@/lib/validations/events";

export type EventActionResult =
  | { ok: true; eventId?: string; tourId?: string }
  | { ok: false; error: string };

type ArtistContext =
  | { ok: false; error: string }
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createClient>>;
      artist: { id: string; slug: string };
    };

async function requireArtistContext(): Promise<ArtistContext> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Connect Supabase to manage events" };
  }

  const supabase = await createClient();
  const { data: artist } = await supabase
    .from("artists")
    .select("id, slug")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!artist) return { ok: false, error: "Complete artist profile first" };

  return { ok: true, supabase, artist };
}

function revalidateEventPaths(artistSlug: string) {
  revalidatePath("/artist/dashboard");
  revalidatePath("/artist/events/new");
  revalidatePath(`/artists/${artistSlug}`);
}

export async function createEventAction(input: unknown): Promise<EventActionResult> {
  const ctx = await requireArtistContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = createEventSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const result = await createStandaloneEvent(ctx.supabase, ctx.artist.id, {
      title: parsed.data.title,
      virtualLocationLabel: parsed.data.virtualLocationLabel,
      scheduledAt: parsed.data.scheduledAt,
      ticketPriceCents: Math.round(parsed.data.ticketPriceDollars * 100),
      description: parsed.data.description,
      timezone: parsed.data.timezone,
    });

    revalidateEventPaths(ctx.artist.slug);
    revalidatePath(`/artist/events/${result.eventId}`);
    revalidatePath(`/artists/${ctx.artist.slug}/events/${result.eventSlug}`);

    return { ok: true, eventId: result.eventId, tourId: result.tourId };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create event",
    };
  }
}

export async function createEventAndRedirectAction(input: unknown) {
  const result = await createEventAction(input);
  if (!result.ok) return result;
  redirect(`/artist/events/${result.eventId}`);
}
