import { z } from "zod";
import { venueSlugSchema } from "@/lib/validations/venues";

export const sponsorshipProductSchema = z.enum([
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
]);

export const createSponsorCampaignSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(2).max(160),
  venueId: z.string().uuid().optional().nullable(),
  budgetCents: z.coerce.number().int().min(0).optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
});

export const updateCampaignStatusSchema = z.object({
  campaignId: z.string().uuid(),
  organizationId: z.string().uuid(),
  status: z.enum(["draft", "active", "paused", "completed", "cancelled"]),
});

export const createAdvertisementSchema = z.object({
  organizationId: z.string().uuid(),
  campaignId: z.string().uuid(),
  name: z.string().min(2).max(160),
  assetUrl: z.string().url().optional().nullable().or(z.literal("")),
  clickUrl: z.string().url().optional().nullable().or(z.literal("")),
  creativeType: z.enum(["image", "html", "video"]).optional(),
  isInteractive: z.boolean().optional(),
});

export const scheduleAdvertisementSchema = z.object({
  organizationId: z.string().uuid(),
  advertisementId: z.string().uuid(),
  billboardId: z.string().uuid(),
  priority: z.coerce.number().int().min(0).max(100).optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
});

export const createSponsorCouponSchema = z.object({
  organizationId: z.string().uuid(),
  campaignId: z.string().uuid(),
  code: z.string().min(3).max(32).regex(/^[A-Z0-9_-]+$/i),
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional().nullable(),
  discountBps: z.coerce.number().int().min(0).max(10000).optional().nullable(),
  maxRedemptions: z.coerce.number().int().min(1).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const redeemSponsorCouponSchema = z.object({
  code: z.string().min(3).max(32),
  campaignId: z.string().uuid().optional(),
});

export const addSponsorMemberSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["owner", "analyst", "viewer"]).optional(),
});

export const foundingSponsorInquirySchema = z.object({
  organizationName: z.string().min(2).max(160),
  contactEmail: z.string().email(),
  venueSlug: venueSlugSchema,
  message: z.string().max(2000).optional(),
});
