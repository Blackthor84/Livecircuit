import { z } from "zod";

export const createVenuePostSchema = z.object({
  venueId: z.string().uuid(),
  title: z.string().max(200).optional().nullable().or(z.literal("")),
  body: z.string().min(1).max(5000),
  kind: z.enum(["discussion", "achievement", "ranking"]).optional(),
});

export const upsertVenueReviewSchema = z.object({
  venueId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().max(2000).optional().nullable().or(z.literal("")),
});

export const venueCommunityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(500).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().datetime().optional(),
});
