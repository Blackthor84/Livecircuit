import { z } from "zod";
import { LOCAL_BUSINESS_CATEGORIES, LOCAL_BUSINESS_CAMPAIGNS } from "@/lib/constants/local-business";

const categoryValues = LOCAL_BUSINESS_CATEGORIES.map((c) => c.value) as [string, ...string[]];
const campaignTypes = LOCAL_BUSINESS_CAMPAIGNS.map((c) => c.type) as [string, ...string[]];

export const upsertLocalBusinessSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.enum(categoryValues),
  description: z.string().trim().max(4000),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  addressLine: z.string().trim().max(200).optional(),
  city: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  isPublished: z.boolean().default(true),
});

export const linkVenueSchema = z.object({
  venueSlug: z.string().trim().min(1),
  isFeatured: z.boolean().default(false),
});

export const createLocalCouponSchema = z.object({
  code: z.string().trim().min(3).max(32),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  discountLabel: z.string().trim().min(2).max(80),
  maxRedemptions: z.coerce.number().int().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const redeemLocalCouponSchema = z.object({
  couponId: z.string().uuid(),
  venueSlug: z.string().optional(),
});

export const purchaseCampaignSchema = z.object({
  campaignType: z.enum(campaignTypes),
  venueSlug: z.string().optional(),
  festivalSlug: z.string().optional(),
});

export const recordClickSchema = z.object({
  businessId: z.string().uuid(),
});
