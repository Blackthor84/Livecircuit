import { z } from "zod";

export const venueSlugSchema = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens");

export const upsertVenueSchema = z.object({
  id: z.string().uuid().optional(),
  slug: venueSlugSchema,
  name: z.string().min(2).max(120),
  region: z.string().min(2).max(120),
  stateCode: z.string().max(8).optional().nullable(),
  countryId: z.string().uuid().optional().nullable(),
  stateId: z.string().uuid().optional().nullable(),
  cityId: z.string().uuid().optional().nullable(),
  venueTypeSlug: z.string().min(1),
  capacity: z.coerce.number().int().min(100).max(5_000_000),
  softCapacityLimit: z.coerce.number().int().min(1).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  bannerUrl: z.string().url().optional().nullable().or(z.literal("")),
  heroImageUrl: z.string().url().optional().nullable().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export const toggleVenueActiveSchema = z.object({
  venueId: z.string().uuid(),
  isActive: z.boolean(),
});

export const assignVenueThemeSchema = z.object({
  venueId: z.string().uuid(),
  themeSlug: z.string().min(1),
  endsAt: z.string().datetime().optional().nullable(),
});

export const venueFeaturedArtistSchema = z.object({
  venueId: z.string().uuid(),
  artistSlug: z.string().min(1),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
});

export const removeVenueFeaturedArtistSchema = z.object({
  venueId: z.string().uuid(),
  artistId: z.string().uuid(),
});

export const upsertSponsorOrganizationSchema = z.object({
  id: z.string().uuid().optional(),
  slug: venueSlugSchema,
  name: z.string().min(2).max(160),
  logoUrl: z.string().url().optional().nullable().or(z.literal("")),
  websiteUrl: z.string().url().optional().nullable().or(z.literal("")),
  billingEmail: z.string().email().optional().nullable().or(z.literal("")),
});

export const upsertVenueSponsorshipSchema = z.object({
  id: z.string().uuid().optional(),
  venueId: z.string().uuid(),
  organizationId: z.string().uuid(),
  product: z.enum([
    "venue_naming_rights",
    "digital_billboard",
    "homepage_banner",
    "concourse_booth",
    "pre_show_ad",
    "vip_lounge",
    "exclusive_promotion",
    "merch_sponsorship",
    "category_sponsorship",
    "founding_sponsor",
  ]),
  displayName: z.string().max(200).optional().nullable(),
  isFoundingSponsor: z.boolean().optional(),
  priorityRenewal: z.boolean().optional(),
  launchPricingCents: z.coerce.number().int().min(0).optional().nullable(),
  contractEndsAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
  historyNote: z.string().max(2000).optional().nullable(),
});

export const upsertConcourseShopSchema = z.object({
  id: z.string().uuid().optional(),
  venueId: z.string().uuid(),
  kind: z.enum([
    "merchandise",
    "food_sponsor",
    "advertisement_kiosk",
    "photo_booth",
    "meet_and_greet",
    "event_board",
    "venue_directory",
    "local_business",
    "charity",
    "information_desk",
    "interactive",
  ]),
  name: z.string().min(2).max(120),
  slug: venueSlugSchema,
  description: z.string().max(2000).optional().nullable(),
  bannerUrl: z.string().url().optional().nullable().or(z.literal("")),
  sponsorOrganizationId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const moderateVenuePostSchema = z.object({
  postId: z.string().uuid(),
  action: z.enum(["pin", "unpin", "delete"]),
});

export const assignEventVenueSchema = z.object({
  eventId: z.string().uuid(),
  venueId: z.string().uuid().nullable(),
  venueRoomLabel: z.string().max(120).nullable().optional(),
});

export const venueEventsQuerySchema = z.object({
  status: z.enum(["live", "scheduled", "ended", "all"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

export const venueListQuerySchema = z.object({
  countryId: z.string().uuid().optional(),
  stateCode: z.string().max(8).optional(),
  region: z.string().max(120).optional(),
  venueType: z.string().max(80).optional(),
  liveNow: z.enum(["true", "false"]).optional(),
  sort: z.enum(["popularity", "name", "visitors"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(24),
});
