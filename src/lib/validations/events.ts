import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(2, "Event title is required").max(120),
  virtualLocationLabel: z.string().min(2, "Location label is required").max(200),
  scheduledAt: z.string().min(1, "Date and time required"),
  ticketPriceDollars: z.coerce.number().min(0).max(1_000_000),
  description: z.string().max(2000).optional(),
  timezone: z.string().max(64).default("UTC"),
});
