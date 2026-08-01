import { z } from "zod";

const audienceModeSchema = z.enum([
  "worldwide",
  "us_only",
  "local_priority",
  "local_only",
  "invite_only",
  "subscribers_only",
  "vip_only",
]);

export const createTourSchema = z.object({
  title: z.string().min(2, "Tour name is required").max(120),
  description: z.string().max(5000).optional(),
  templateSlug: z.string().max(64).optional(),
  tourType: z
    .enum(["city", "state", "regional", "national", "continental", "world"])
    .optional(),
});

export const updateTourSchema = z.object({
  tourId: z.string().uuid(),
  title: z.string().min(2).max(120),
  description: z.string().max(5000).optional(),
});

export const tourStopSchema = z.object({
  tourId: z.string().uuid(),
  stopId: z.string().uuid().optional(),
  virtualLocationLabel: z.string().min(2, "Location label is required").max(200),
  cityId: z.string().uuid().nullable().optional(),
  scheduledAt: z.string().min(1, "Date and time required"),
  timezone: z.string().max(64).default("UTC"),
  ticketPriceCents: z.coerce.number().int().min(0).max(1_000_000_00),
  vipPriceCents: z.coerce.number().int().min(0).max(1_000_000_00).nullable().optional(),
  capacity: z.coerce.number().int().min(1).max(1_000_000).default(1000),
  vipCapacity: z.coerce.number().int().min(0).max(1_000_000).nullable().optional(),
  description: z.string().max(2000).optional(),
  hasMeetGreet: z.boolean().optional(),
  merchEnabled: z.boolean().optional(),
  venueId: z.string().uuid().nullable().optional(),
  venueRoomLabel: z.string().max(120).nullable().optional(),
  tourCity: z.string().min(2).max(120).optional(),
  tourStateCode: z.string().max(8).optional().nullable(),
  doorsOpenAt: z.string().optional().nullable(),
  audienceMode: audienceModeSchema.optional(),
  localPriorityMinutes: z.coerce.number().int().min(0).max(180).optional(),
});

export const assignTourStopVenueSchema = z.object({
  tourId: z.string().uuid(),
  stopId: z.string().uuid(),
  venueId: z.string().uuid().nullable(),
  venueRoomLabel: z.string().max(120).nullable().optional(),
});

export const publishTourSchema = z.object({
  tourId: z.string().uuid(),
});

export const deleteTourSchema = z.object({
  tourId: z.string().uuid(),
});

export const deleteTourStopSchema = z.object({
  stopId: z.string().uuid(),
  tourId: z.string().uuid(),
});

export const reorderTourStopSchema = z.object({
  tourId: z.string().uuid(),
  stopId: z.string().uuid(),
  direction: z.enum(["up", "down"]),
});
