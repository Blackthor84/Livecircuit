"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import {
  syncAllStopEvents,
  syncEventForTourStop,
  tourWindowFromStops,
  uniqueTourSlug,
} from "@/lib/services/tours.service";
import {
  assignTourStopVenueSchema,
  createTourSchema,
  deleteTourSchema,
  deleteTourStopSchema,
  publishTourSchema,
  tourStopSchema,
  updateTourSchema,
} from "@/lib/validations/tours";
import {
  defaultVenueRoomLabel,
  checkVenueSoftCapacity,
  syncVenueFromStopToEvent,
} from "@/lib/services/venues.service";
import { stateNameFromCode, buildVirtualLocationLabel } from "@/lib/virtual-touring/location";

export type TourActionResult =
  | { ok: true; tourId?: string; stopId?: string }
  | { ok: false; error: string };

type ArtistContext =
  | { ok: false; error: string }
  | {
      ok: true;
      user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;
      supabase: Awaited<ReturnType<typeof createClient>>;
      artist: { id: string; slug: string };
    };

async function requireArtistContext(): Promise<ArtistContext> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Connect Supabase to manage tours" };
  }

  const supabase = await createClient();
  const { data: artist } = await supabase
    .from("artists")
    .select("id, slug")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!artist) return { ok: false, error: "Complete artist profile first" };

  return { ok: true, user, supabase, artist };
}

async function loadOwnedTour(supabase: Awaited<ReturnType<typeof createClient>>, artistId: string, tourId: string) {
  const { data: tour } = await supabase
    .from("tours")
    .select("*")
    .eq("id", tourId)
    .eq("artist_id", artistId)
    .maybeSingle();
  return tour;
}

function revalidateTourPaths(artistSlug: string, tourSlug?: string) {
  revalidatePath("/artist/dashboard");
  revalidatePath(`/artist/tours`);
  revalidatePath("/tours");
  revalidatePath(`/artists/${artistSlug}`);
  if (tourSlug) {
    revalidatePath(`/artists/${artistSlug}/tours/${tourSlug}`);
  }
}

export async function createTourAction(input: unknown): Promise<TourActionResult> {
  const ctx = await requireArtistContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = createTourSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const slug = uniqueTourSlug(parsed.data.title);
  const { data, error } = await ctx.supabase
    .from("tours")
    .insert({
      artist_id: ctx.artist.id,
      title: parsed.data.title.trim(),
      slug,
      description: parsed.data.description?.trim() || null,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidateTourPaths(ctx.artist.slug);
  return { ok: true, tourId: data.id };
}

export async function createTourAndRedirectAction(input: unknown) {
  const result = await createTourAction(input);
  if (!result.ok) return result;
  redirect(`/artist/tours/${result.tourId}`);
}

export async function updateTourAction(input: unknown): Promise<TourActionResult> {
  const ctx = await requireArtistContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = updateTourSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const tour = await loadOwnedTour(ctx.supabase, ctx.artist.id, parsed.data.tourId);
  if (!tour) return { ok: false, error: "Tour not found" };

  const { error } = await ctx.supabase
    .from("tours")
    .update({
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
    })
    .eq("id", tour.id);

  if (error) return { ok: false, error: error.message };

  revalidateTourPaths(ctx.artist.slug, tour.slug);
  revalidatePath(`/artist/tours/${tour.id}`);
  return { ok: true, tourId: tour.id };
}

export async function upsertTourStopAction(input: unknown): Promise<TourActionResult> {
  const ctx = await requireArtistContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = tourStopSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const tour = await loadOwnedTour(ctx.supabase, ctx.artist.id, parsed.data.tourId);
  if (!tour) return { ok: false, error: "Tour not found" };

  const scheduledAt = new Date(parsed.data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { ok: false, error: "Invalid date" };
  }

  const stateCode = parsed.data.tourStateCode?.trim().toUpperCase() || null;
  const tourCity = parsed.data.tourCity?.trim() || null;
  const locationLabel =
    parsed.data.virtualLocationLabel.trim() ||
    (tourCity ? buildVirtualLocationLabel(tourCity, stateCode) : parsed.data.virtualLocationLabel.trim());

  const doorsOpen = parsed.data.doorsOpenAt
    ? new Date(parsed.data.doorsOpenAt)
    : new Date(scheduledAt.getTime() - 30 * 60_000);

  const payload = {
    tour_id: tour.id,
    virtual_location_label: locationLabel,
    tour_city: tourCity,
    tour_state_code: stateCode,
    tour_state_name: stateNameFromCode(stateCode),
    doors_open_at: Number.isNaN(doorsOpen.getTime()) ? null : doorsOpen.toISOString(),
    show_starts_at: scheduledAt.toISOString(),
    audience_mode: parsed.data.audienceMode ?? "worldwide",
    local_priority_minutes: parsed.data.localPriorityMinutes ?? 30,
    city_id: parsed.data.cityId || null,
    venue_id: parsed.data.venueId ?? null,
    venue_room_label: parsed.data.venueRoomLabel?.trim() || null,
    scheduled_at: scheduledAt.toISOString(),
    timezone: parsed.data.timezone || "UTC",
    ticket_price_cents: parsed.data.ticketPriceCents,
    vip_price_cents: parsed.data.vipPriceCents ?? null,
    capacity: parsed.data.capacity,
    vip_capacity: parsed.data.vipCapacity ?? null,
    description: parsed.data.description?.trim() || null,
    has_meet_greet: parsed.data.hasMeetGreet ?? false,
    merch_enabled: parsed.data.merchEnabled ?? true,
  };

  let stopId = parsed.data.stopId;

  if (parsed.data.venueId) {
    const capacity = await checkVenueSoftCapacity(ctx.supabase, parsed.data.venueId);
    if (!capacity.ok) return { ok: false, error: capacity.error };
  }

  if (stopId) {
    const { error } = await ctx.supabase.from("tour_stops").update(payload).eq("id", stopId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data: maxRow } = await ctx.supabase
      .from("tour_stops")
      .select("stop_order")
      .eq("tour_id", tour.id)
      .order("stop_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const stop_order = (maxRow?.stop_order ?? -1) + 1;
    const { data: inserted, error } = await ctx.supabase
      .from("tour_stops")
      .insert({ ...payload, stop_order })
      .select(
        "id, tour_id, city_id, venue_id, venue_room_label, virtual_location_label, stop_order, scheduled_at, ticket_price_cents"
      )
      .single();

    if (error || !inserted) return { ok: false, error: error?.message ?? "Failed to add stop" };
    stopId = inserted.id;

    let stopRow = inserted;
    if (payload.venue_id && !payload.venue_room_label) {
      const room = defaultVenueRoomLabel({
        artistSlug: ctx.artist.slug,
        tourSlug: tour.slug,
        stopOrder: stop_order,
        virtualLocationLabel: payload.virtual_location_label,
      });
      await ctx.supabase
        .from("tour_stops")
        .update({ venue_room_label: room })
        .eq("id", stopId);
      stopRow = { ...inserted, venue_room_label: room };
    }

    await syncEventForTourStop(ctx.supabase, tour, stopRow);
  }

  const { data: stops } = await ctx.supabase
    .from("tour_stops")
    .select("scheduled_at")
    .eq("tour_id", tour.id);

  const window = tourWindowFromStops(stops ?? []);
  await ctx.supabase
    .from("tours")
    .update({ starts_at: window.starts_at, ends_at: window.ends_at })
    .eq("id", tour.id);

  if (parsed.data.stopId) {
    const { data: stop } = await ctx.supabase
      .from("tour_stops")
      .select(
        "id, tour_id, city_id, venue_id, venue_room_label, virtual_location_label, stop_order, scheduled_at, ticket_price_cents"
      )
      .eq("id", stopId)
      .single();
    if (stop) await syncEventForTourStop(ctx.supabase, tour, stop);
  }

  if (payload.venue_id) {
    const { data: venue } = await ctx.supabase.from("venues").select("slug").eq("id", payload.venue_id).maybeSingle();
    if (venue?.slug) {
      const { revalidatePath } = await import("next/cache");
      revalidatePath(`/livecircuit/venues/${venue.slug}`);
    }
  }

  revalidateTourPaths(ctx.artist.slug, tour.slug);
  revalidatePath(`/artist/tours/${tour.id}`);
  return { ok: true, tourId: tour.id, stopId };
}

export async function deleteTourStopAction(input: unknown): Promise<TourActionResult> {
  const ctx = await requireArtistContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = deleteTourStopSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const tour = await loadOwnedTour(ctx.supabase, ctx.artist.id, parsed.data.tourId);
  if (!tour) return { ok: false, error: "Tour not found" };

  const { error } = await ctx.supabase
    .from("tour_stops")
    .delete()
    .eq("id", parsed.data.stopId)
    .eq("tour_id", tour.id);

  if (error) return { ok: false, error: error.message };

  const { data: stops } = await ctx.supabase
    .from("tour_stops")
    .select("scheduled_at")
    .eq("tour_id", tour.id);
  const window = tourWindowFromStops(stops ?? []);
  await ctx.supabase
    .from("tours")
    .update({ starts_at: window.starts_at, ends_at: window.ends_at })
    .eq("id", tour.id);

  revalidateTourPaths(ctx.artist.slug, tour.slug);
  revalidatePath(`/artist/tours/${tour.id}`);
  return { ok: true, tourId: tour.id };
}

export async function publishTourAction(input: unknown): Promise<TourActionResult> {
  const ctx = await requireArtistContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = publishTourSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const tour = await loadOwnedTour(ctx.supabase, ctx.artist.id, parsed.data.tourId);
  if (!tour) return { ok: false, error: "Tour not found" };
  if (tour.status === "published") return { ok: true, tourId: tour.id };

  const { data: stops } = await ctx.supabase
    .from("tour_stops")
    .select(
      "id, tour_id, city_id, venue_id, venue_room_label, virtual_location_label, stop_order, scheduled_at, ticket_price_cents"
    )
    .eq("tour_id", tour.id)
    .order("stop_order", { ascending: true });

  if (!stops?.length) {
    return { ok: false, error: "Add at least one tour stop before publishing" };
  }

  const publishedTour = { ...tour, status: "published" };
  await syncAllStopEvents(ctx.supabase, publishedTour, stops);

  const window = tourWindowFromStops(stops);
  const { error } = await ctx.supabase
    .from("tours")
    .update({
      status: "published",
      starts_at: window.starts_at,
      ends_at: window.ends_at,
    })
    .eq("id", tour.id);

  if (error) return { ok: false, error: error.message };

  const { notifyFollowers } = await import("@/lib/services/notifications.service");
  await notifyFollowers({
    artistId: ctx.artist.id,
    type: "tour_announced",
    title: `${tour.title} is live`,
    body: "New tour dates are available — grab tickets for your city.",
    link: `/artists/${ctx.artist.slug}/tours/${tour.slug}`,
  });

  revalidateTourPaths(ctx.artist.slug, tour.slug);
  revalidatePath(`/artist/tours/${tour.id}`);
  return { ok: true, tourId: tour.id };
}

export async function assignTourStopVenueAction(input: unknown): Promise<TourActionResult> {
  const ctx = await requireArtistContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = assignTourStopVenueSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const tour = await loadOwnedTour(ctx.supabase, ctx.artist.id, parsed.data.tourId);
  if (!tour) return { ok: false, error: "Tour not found" };

  const { data: stop } = await ctx.supabase
    .from("tour_stops")
    .select("id, stop_order, virtual_location_label")
    .eq("id", parsed.data.stopId)
    .eq("tour_id", tour.id)
    .maybeSingle();

  if (!stop) return { ok: false, error: "Stop not found" };

  if (parsed.data.venueId) {
    const capacity = await checkVenueSoftCapacity(ctx.supabase, parsed.data.venueId);
    if (!capacity.ok) return { ok: false, error: capacity.error };
  }

  const roomLabel =
    parsed.data.venueRoomLabel?.trim() ||
    (parsed.data.venueId
      ? defaultVenueRoomLabel({
          artistSlug: ctx.artist.slug,
          tourSlug: tour.slug,
          stopOrder: stop.stop_order as number,
          virtualLocationLabel: stop.virtual_location_label as string,
        })
      : null);

  const { error } = await ctx.supabase
    .from("tour_stops")
    .update({
      venue_id: parsed.data.venueId,
      venue_room_label: parsed.data.venueId ? roomLabel : null,
    })
    .eq("id", parsed.data.stopId);

  if (error) return { ok: false, error: error.message };

  try {
    await syncVenueFromStopToEvent(
      ctx.supabase,
      parsed.data.stopId,
      parsed.data.venueId,
      parsed.data.venueId ? roomLabel : null
    );
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Venue assignment failed" };
  }

  if (parsed.data.venueId) {
    const { data: venue } = await ctx.supabase
      .from("venues")
      .select("slug")
      .eq("id", parsed.data.venueId)
      .maybeSingle();
    if (venue?.slug) {
      const { revalidatePath } = await import("next/cache");
      revalidatePath(`/livecircuit/venues/${venue.slug}`);
    }
  }

  revalidateTourPaths(ctx.artist.slug, tour.slug);
  revalidatePath(`/artist/tours/${tour.id}`);
  return { ok: true, tourId: tour.id, stopId: parsed.data.stopId };
}

export async function deleteTourAction(input: unknown): Promise<TourActionResult> {
  const ctx = await requireArtistContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = deleteTourSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const tour = await loadOwnedTour(ctx.supabase, ctx.artist.id, parsed.data.tourId);
  if (!tour) return { ok: false, error: "Tour not found" };

  const { error } = await ctx.supabase.from("tours").delete().eq("id", tour.id);
  if (error) return { ok: false, error: error.message };

  revalidateTourPaths(ctx.artist.slug, tour.slug);
  return { ok: true };
}

export async function deleteTourAndRedirectAction(input: unknown) {
  const result = await deleteTourAction(input);
  if (!result.ok) return result;
  redirect("/artist/dashboard");
}
