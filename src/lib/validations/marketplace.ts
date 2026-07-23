import { z } from "zod";
import { CREATOR_SERVICE_CATEGORIES } from "@/lib/constants/creator-marketplace";

const categoryValues = CREATOR_SERVICE_CATEGORIES.map((c) => c.value) as [string, ...string[]];

export const upsertCreatorProfileSchema = z.object({
  headline: z.string().trim().min(4).max(120),
  bio: z.string().trim().max(4000),
  primaryCategory: z.enum(categoryValues),
  secondaryCategories: z.array(z.enum(categoryValues)).max(4).default([]),
  rateCents: z.coerce.number().int().min(0).max(500_000),
  isListed: z.boolean().default(true),
});

export const portfolioItemSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  mediaUrl: z.string().url().optional().or(z.literal("")),
});

export const createBookingSchema = z.object({
  creatorUserId: z.string().uuid(),
  serviceCategory: z.enum(categoryValues),
  title: z.string().trim().min(4).max(160),
  brief: z.string().trim().max(4000).optional(),
});

export const respondBookingSchema = z.object({
  bookingId: z.string().uuid(),
  accept: z.boolean(),
  agreedPriceCents: z.coerce.number().int().min(0).max(500_000).optional(),
});

export const bookingMessageSchema = z.object({
  bookingId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});

export const marketplaceReviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().max(2000).optional(),
});

export const marketplaceCheckoutSchema = z.object({
  bookingId: z.string().uuid(),
});

export const completeBookingSchema = z.object({
  bookingId: z.string().uuid(),
});
