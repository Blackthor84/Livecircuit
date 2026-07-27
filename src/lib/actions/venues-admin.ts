"use server";

import { revalidatePath } from "next/cache";
import { revalidateVenuePublicCache } from "@/lib/cache/revalidate-venue-cache";
import { requireRole } from "@/lib/auth/session";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import {
  defaultVenueRoomLabel,
  applyVenueToEvent,
  checkVenueSoftCapacity,
} from "@/lib/services/venues.service";
import {
  assignEventVenueSchema,
  assignVenueThemeSchema,
  moderateVenuePostSchema,
  removeVenueFeaturedArtistSchema,
  toggleVenueActiveSchema,
  upsertConcourseShopSchema,
  upsertSponsorOrganizationSchema,
  upsertVenueSchema,
  upsertVenueSponsorshipSchema,
  renameVenuePlaceholderSchema,
  updateVenueSponsorshipSchema,
  clearVenueSponsorshipSchema,
  venueFeaturedArtistSchema,
} from "@/lib/validations/venues";
import {
  defaultNamingRightsPrice,
  tierForCapacity,
} from "@/lib/venues/placeholder-names";

export type VenueAdminActionResult =
  | { ok: true; venueId?: string }
  | { ok: false; error: string };

async function requireAdmin() {
  const profile = await requireRole([...ADMIN_ROLES]);
  if (!profile) return { ok: false as const, error: "Admin access required" };
  if (!isSupabaseConfigured()) return { ok: false as const, error: "Supabase required" };
  const supabase = await createClient();
  return { ok: true as const, supabase, adminId: profile.id };
}

function emptyToNull(value: string | null | undefined) {
  if (value == null || value === "") return null;
  return value;
}

export async function upsertVenueAction(input: unknown): Promise<VenueAdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = upsertVenueSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { data: venueType } = await ctx.supabase
    .from("venue_types")
    .select("id")
    .eq("slug", parsed.data.venueTypeSlug)
    .maybeSingle();

  if (!venueType) return { ok: false, error: "Unknown venue type" };

  const defaultName = parsed.data.defaultName.trim();
  const tier = tierForCapacity(parsed.data.capacity);
  const namingRightsPrice =
    parsed.data.namingRightsPrice ?? defaultNamingRightsPrice(tier);

  if (parsed.data.id) {
    const { data: existing } = await ctx.supabase
      .from("venues")
      .select("slug")
      .eq("id", parsed.data.id)
      .maybeSingle();

    if (!existing) return { ok: false, error: "Venue not found" };
    if (existing.slug !== parsed.data.slug) {
      return { ok: false, error: "Venue slug is permanent and cannot be changed" };
    }

    const row = {
      default_name: defaultName,
      region: parsed.data.region.trim(),
      state_code: parsed.data.stateCode?.trim() || null,
      country_id: parsed.data.countryId ?? null,
      state_id: parsed.data.stateId ?? null,
      city_id: parsed.data.cityId ?? null,
      venue_type_id: venueType.id,
      capacity: parsed.data.capacity,
      soft_capacity_limit: parsed.data.softCapacityLimit ?? null,
      description: emptyToNull(parsed.data.description ?? null),
      banner_url: emptyToNull(parsed.data.bannerUrl ?? null),
      hero_image_url: emptyToNull(parsed.data.heroImageUrl ?? null),
      is_active: parsed.data.isActive ?? true,
      naming_rights_price: namingRightsPrice,
      is_placeholder_name: parsed.data.isPlaceholderName ?? true,
    };

    const { error } = await ctx.supabase.from("venues").update(row).eq("id", parsed.data.id);
    if (error) return { ok: false, error: error.message };
    revalidateVenuePaths(parsed.data.id, parsed.data.slug);
    revalidatePath("/");
    return { ok: true, venueId: parsed.data.id };
  }

  const row = {
    slug: parsed.data.slug,
    default_name: defaultName,
    display_name: defaultName,
    name: defaultName,
    region: parsed.data.region.trim(),
    state_code: parsed.data.stateCode?.trim() || null,
    country_id: parsed.data.countryId ?? null,
    state_id: parsed.data.stateId ?? null,
    city_id: parsed.data.cityId ?? null,
    venue_type_id: venueType.id,
    capacity: parsed.data.capacity,
    soft_capacity_limit: parsed.data.softCapacityLimit ?? null,
    description: emptyToNull(parsed.data.description ?? null),
    banner_url: emptyToNull(parsed.data.bannerUrl ?? null),
    hero_image_url: emptyToNull(parsed.data.heroImageUrl ?? null),
    is_active: parsed.data.isActive ?? true,
    naming_rights_price: namingRightsPrice,
    is_placeholder_name: parsed.data.isPlaceholderName ?? true,
    sponsorship_status: "available" as const,
  };

  const { data: inserted, error } = await ctx.supabase
    .from("venues")
    .insert(row)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  const venueId = inserted.id as string;

  const { data: locationTypes } = await ctx.supabase
    .from("billboard_location_types")
    .select("id, slug")
    .in("slug", ["homepage", "concourse"]);

  for (const lt of locationTypes ?? []) {
    const slug = lt.slug === "homepage" ? "homepage-hero" : "concourse-main";
    const label = lt.slug === "homepage" ? "Homepage Hero Billboard" : "Main Concourse Billboard";
    await ctx.supabase.from("venue_billboards").insert({
      venue_id: venueId,
      location_type_id: lt.id,
      slug,
      label,
      zone_key: lt.slug,
    });
  }

  await ctx.supabase.from("venue_badges").insert({
    venue_id: venueId,
    slug: "founding-sponsor-legacy",
    name: "Founding Sponsor Legacy",
    description: "Permanent recognition for the first naming sponsor of this venue.",
  });

  revalidateVenuePaths(venueId, parsed.data.slug);
  return { ok: true, venueId };
}

export async function toggleVenueActiveAction(input: unknown): Promise<VenueAdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = toggleVenueActiveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { data: venue } = await ctx.supabase
    .from("venues")
    .select("slug")
    .eq("id", parsed.data.venueId)
    .maybeSingle();

  const { error } = await ctx.supabase
    .from("venues")
    .update({ is_active: parsed.data.isActive })
    .eq("id", parsed.data.venueId);

  if (error) return { ok: false, error: error.message };

  revalidateVenuePaths(parsed.data.venueId, venue?.slug as string | undefined);
  return { ok: true, venueId: parsed.data.venueId };
}

export async function assignVenueThemeAction(input: unknown): Promise<VenueAdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = assignVenueThemeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { data: theme } = await ctx.supabase
    .from("venue_themes")
    .select("id, default_palette")
    .eq("slug", parsed.data.themeSlug)
    .maybeSingle();

  if (!theme) return { ok: false, error: "Theme not found" };

  const { data: venue } = await ctx.supabase
    .from("venues")
    .select("slug")
    .eq("id", parsed.data.venueId)
    .maybeSingle();

  await ctx.supabase
    .from("venue_theme_assignments")
    .update({ is_active: false, ends_at: new Date().toISOString() })
    .eq("venue_id", parsed.data.venueId)
    .eq("is_active", true);

  const { error } = await ctx.supabase.from("venue_theme_assignments").insert({
    venue_id: parsed.data.venueId,
    theme_id: theme.id,
    ends_at: parsed.data.endsAt ?? null,
    is_active: true,
  });

  if (error) return { ok: false, error: error.message };

  await ctx.supabase
    .from("venues")
    .update({
      theme_palette: theme.default_palette ?? {},
    })
    .eq("id", parsed.data.venueId);

  revalidateVenuePaths(parsed.data.venueId, venue?.slug as string | undefined);
  if (venue?.slug) revalidateVenuePublicCache(venue.slug as string, parsed.data.venueId);
  return { ok: true, venueId: parsed.data.venueId };
}

export async function addVenueFeaturedArtistAction(input: unknown): Promise<VenueAdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = venueFeaturedArtistSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { data: artist } = await ctx.supabase
    .from("artists")
    .select("id")
    .eq("slug", parsed.data.artistSlug.trim())
    .maybeSingle();

  if (!artist) return { ok: false, error: "Artist not found" };

  const { error } = await ctx.supabase.from("venue_featured_artists").upsert(
    {
      venue_id: parsed.data.venueId,
      artist_id: artist.id,
      sort_order: parsed.data.sortOrder ?? 0,
    },
    { onConflict: "venue_id,artist_id" }
  );

  if (error) return { ok: false, error: error.message };

  revalidateVenuePaths(parsed.data.venueId);
  return { ok: true, venueId: parsed.data.venueId };
}

export async function removeVenueFeaturedArtistAction(
  input: unknown
): Promise<VenueAdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = removeVenueFeaturedArtistSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { error } = await ctx.supabase
    .from("venue_featured_artists")
    .delete()
    .eq("venue_id", parsed.data.venueId)
    .eq("artist_id", parsed.data.artistId);

  if (error) return { ok: false, error: error.message };

  revalidateVenuePaths(parsed.data.venueId);
  return { ok: true, venueId: parsed.data.venueId };
}

export async function upsertSponsorOrganizationAction(
  input: unknown
): Promise<VenueAdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = upsertSponsorOrganizationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const row = {
    slug: parsed.data.slug,
    name: parsed.data.name.trim(),
    logo_url: emptyToNull(parsed.data.logoUrl ?? null),
    website_url: emptyToNull(parsed.data.websiteUrl ?? null),
    billing_email: emptyToNull(parsed.data.billingEmail ?? null),
  };

  if (parsed.data.id) {
    const { error } = await ctx.supabase
      .from("sponsor_organizations")
      .update(row)
      .eq("id", parsed.data.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await ctx.supabase.from("sponsor_organizations").insert(row);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/admin/venues");
  return { ok: true };
}

export async function upsertVenueSponsorshipAction(
  input: unknown
): Promise<VenueAdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = upsertVenueSponsorshipSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const isFounding =
    parsed.data.isFoundingSponsor === true ||
    parsed.data.product === "founding_sponsor";

  if (isFounding) {
    const { data: existing } = await ctx.supabase
      .from("venue_sponsorships")
      .select("id")
      .eq("venue_id", parsed.data.venueId)
      .eq("is_founding_sponsor", true)
      .eq("is_active", true)
      .maybeSingle();

    if (existing && existing.id !== parsed.data.id) {
      return {
        ok: false,
        error: "This venue already has an active Founding Sponsor. Deactivate it first.",
      };
    }
  }

  const row = {
    venue_id: parsed.data.venueId,
    organization_id: parsed.data.organizationId,
    product: isFounding ? "founding_sponsor" : parsed.data.product,
    display_name: emptyToNull(parsed.data.displayName ?? null),
    is_founding_sponsor: isFounding,
    priority_renewal: parsed.data.priorityRenewal ?? isFounding,
    launch_pricing_cents: parsed.data.launchPricingCents ?? null,
    contract_ends_at: parsed.data.contractEndsAt ?? null,
    is_active: parsed.data.isActive ?? true,
    history_note: emptyToNull(parsed.data.historyNote ?? null),
  };

  let sponsorshipId = parsed.data.id;

  if (parsed.data.id) {
    const { error } = await ctx.supabase
      .from("venue_sponsorships")
      .update(row)
      .eq("id", parsed.data.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data: inserted, error } = await ctx.supabase
      .from("venue_sponsorships")
      .insert(row)
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    sponsorshipId = inserted.id as string;
  }

  if (isFounding && row.is_active) {
    const { data: org } = await ctx.supabase
      .from("sponsor_organizations")
      .select("name, logo_url")
      .eq("id", parsed.data.organizationId)
      .maybeSingle();

    await ctx.supabase
      .from("venues")
      .update({
        founding_sponsor_org_id: parsed.data.organizationId,
        featured_sponsor_org_id: parsed.data.organizationId,
        sponsored_name: row.display_name,
        sponsor_company: org?.name ?? null,
        sponsor_logo_url: org?.logo_url ?? null,
        sponsor_start_date: new Date().toISOString().slice(0, 10),
        sponsor_end_date: parsed.data.contractEndsAt?.slice(0, 10) ?? null,
        naming_rights_price: parsed.data.launchPricingCents ?? null,
        sponsorship_status: "active",
        is_placeholder_name: false,
      })
      .eq("id", parsed.data.venueId);
  }

  if (
    row.is_active &&
    (parsed.data.product === "venue_naming_rights" || isFounding)
  ) {
    await ctx.supabase
      .from("venues")
      .update({ featured_sponsor_org_id: parsed.data.organizationId })
      .eq("id", parsed.data.venueId);
  }

  void sponsorshipId;
  revalidateVenuePaths(parsed.data.venueId);
  return { ok: true, venueId: parsed.data.venueId };
}

export async function upsertConcourseShopAction(input: unknown): Promise<VenueAdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = upsertConcourseShopSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const row = {
    venue_id: parsed.data.venueId,
    kind: parsed.data.kind,
    name: parsed.data.name.trim(),
    slug: parsed.data.slug,
    description: emptyToNull(parsed.data.description ?? null),
    banner_url: emptyToNull(parsed.data.bannerUrl ?? null),
    sponsor_organization_id: parsed.data.sponsorOrganizationId ?? null,
    is_active: parsed.data.isActive ?? true,
    sort_order: parsed.data.sortOrder ?? 0,
  };

  if (parsed.data.id) {
    const { error } = await ctx.supabase
      .from("concourse_shops")
      .update(row)
      .eq("id", parsed.data.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await ctx.supabase.from("concourse_shops").insert(row);
    if (error) return { ok: false, error: error.message };
  }

  revalidateVenuePaths(parsed.data.venueId);
  return { ok: true, venueId: parsed.data.venueId };
}

export async function assignEventVenueAction(input: unknown): Promise<VenueAdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = assignEventVenueSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { data: event } = await ctx.supabase
    .from("events")
    .select("id, slug, artist_id, tour_stop_id, artists(slug)")
    .eq("id", parsed.data.eventId)
    .maybeSingle();

  if (!event) return { ok: false, error: "Event not found" };

  if (parsed.data.venueId) {
    const capacity = await checkVenueSoftCapacity(ctx.supabase, parsed.data.venueId, parsed.data.eventId);
    if (!capacity.ok) return { ok: false, error: capacity.error };
  }

  const artists = event.artists as { slug: string } | { slug: string }[] | null;
  const artistSlug = Array.isArray(artists) ? artists[0]?.slug : artists?.slug;

  let roomLabel = parsed.data.venueRoomLabel?.trim() || null;
  if (parsed.data.venueId && !roomLabel && artistSlug) {
    roomLabel = defaultVenueRoomLabel({
      artistSlug,
      tourSlug: "event",
      stopOrder: 0,
      virtualLocationLabel: event.slug as string,
    });
  }

  try {
    await applyVenueToEvent(
      ctx.supabase,
      parsed.data.eventId,
      parsed.data.venueId,
      parsed.data.venueId ? roomLabel : null,
      { excludeEventId: parsed.data.eventId }
    );
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Assignment failed" };
  }

  if (event.tour_stop_id) {
    await ctx.supabase
      .from("tour_stops")
      .update({
        venue_id: parsed.data.venueId,
        venue_room_label: parsed.data.venueId ? roomLabel : null,
      })
      .eq("id", event.tour_stop_id);
  }

  if (parsed.data.venueId) {
    const { data: venue } = await ctx.supabase
      .from("venues")
      .select("slug, id")
      .eq("id", parsed.data.venueId)
      .maybeSingle();
    if (venue?.slug) revalidateVenuePaths(venue.id as string, venue.slug as string);
  }

  revalidatePath("/admin/venues");
  return { ok: true };
}

export async function moderateVenuePostAction(input: unknown): Promise<VenueAdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = moderateVenuePostSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { data: post } = await ctx.supabase
    .from("venue_posts")
    .select("venue_id, venues(slug)")
    .eq("id", parsed.data.postId)
    .maybeSingle();

  if (!post) return { ok: false, error: "Post not found" };

  if (parsed.data.action === "delete") {
    const { error } = await ctx.supabase.from("venue_posts").delete().eq("id", parsed.data.postId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await ctx.supabase
      .from("venue_posts")
      .update({ is_pinned: parsed.data.action === "pin" })
      .eq("id", parsed.data.postId);
    if (error) return { ok: false, error: error.message };
  }

  const venueSlug = (() => {
    const v = post.venues as { slug: string } | { slug: string }[] | null;
    if (Array.isArray(v)) return v[0]?.slug;
    return v?.slug;
  })();

  revalidateVenuePaths(post.venue_id as string, venueSlug);
  return { ok: true, venueId: post.venue_id as string };
}

export async function renameVenuePlaceholderAction(input: unknown): Promise<VenueAdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = renameVenuePlaceholderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { data: venue } = await ctx.supabase
    .from("venues")
    .select("slug")
    .eq("id", parsed.data.venueId)
    .maybeSingle();

  if (!venue) return { ok: false, error: "Venue not found" };

  const { error } = await ctx.supabase
    .from("venues")
    .update({ default_name: parsed.data.defaultName.trim(), is_placeholder_name: true })
    .eq("id", parsed.data.venueId);

  if (error) return { ok: false, error: error.message };

  revalidateVenuePaths(parsed.data.venueId, venue.slug as string);
  revalidatePath("/");
  return { ok: true, venueId: parsed.data.venueId };
}

export async function updateVenueNamingRightsAction(input: unknown): Promise<VenueAdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = updateVenueSponsorshipSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { data: venue } = await ctx.supabase
    .from("venues")
    .select("slug")
    .eq("id", parsed.data.venueId)
    .maybeSingle();

  if (!venue) return { ok: false, error: "Venue not found" };

  const sponsoredName = emptyToNull(parsed.data.sponsoredName ?? null);
  const row = {
    sponsored_name: sponsoredName,
    sponsor_company: emptyToNull(parsed.data.sponsorCompany ?? null),
    sponsor_logo_url: emptyToNull(parsed.data.sponsorLogoUrl ?? null),
    sponsor_start_date: emptyToNull(parsed.data.sponsorStartDate ?? null),
    sponsor_end_date: emptyToNull(parsed.data.sponsorEndDate ?? null),
    sponsorship_status: parsed.data.sponsorshipStatus ?? (sponsoredName ? "active" : "available"),
    naming_rights_price: parsed.data.namingRightsPrice ?? null,
    is_placeholder_name: !sponsoredName,
  };

  const { error } = await ctx.supabase.from("venues").update(row).eq("id", parsed.data.venueId);
  if (error) return { ok: false, error: error.message };

  revalidateVenuePaths(parsed.data.venueId, venue.slug as string);
  revalidatePath("/");
  return { ok: true, venueId: parsed.data.venueId };
}

export async function clearVenueSponsorshipAction(input: unknown): Promise<VenueAdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = clearVenueSponsorshipSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { data: venue } = await ctx.supabase
    .from("venues")
    .select("slug")
    .eq("id", parsed.data.venueId)
    .maybeSingle();

  if (!venue) return { ok: false, error: "Venue not found" };

  const { error } = await ctx.supabase
    .from("venues")
    .update({
      sponsored_name: null,
      sponsor_company: null,
      sponsor_logo_url: null,
      sponsor_start_date: null,
      sponsor_end_date: null,
      sponsorship_status: "available",
      is_placeholder_name: true,
    })
    .eq("id", parsed.data.venueId);

  if (error) return { ok: false, error: error.message };

  revalidateVenuePaths(parsed.data.venueId, venue.slug as string);
  revalidatePath("/");
  return { ok: true, venueId: parsed.data.venueId };
}

function revalidateVenuePaths(venueId: string, slug?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/venues");
  revalidatePath(`/admin/venues/${venueId}`);
  revalidatePath("/api/venues");
  if (slug) {
    revalidateVenuePublicCache(slug);
    revalidatePath(`/api/venues/${slug}`);
    revalidatePath(`/api/venues/${slug}/concourse`);
    revalidatePath(`/api/venues/${slug}/community`);
    revalidatePath(`/livecircuit/venues/${slug}`);
    revalidatePath(`/livecircuit/venues/${slug}/concourse`);
    revalidatePath(`/livecircuit/venues/${slug}/community`);
    revalidatePath(`/api/venues/${slug}/theme`);
    revalidatePath(`/livecircuit/venues/${slug}/loyalty`);
  }
}
