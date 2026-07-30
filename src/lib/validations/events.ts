import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(2, "Event title is required").max(120),
  virtualLocationLabel: z.string().min(2, "Location label is required").max(200),
  tourCity: z.string().min(2).max(120),
  tourStateCode: z.string().max(8).optional().nullable(),
  scheduledAt: z.string().min(1, "Date and time required"),
  doorsOpenAt: z.string().optional().nullable(),
  ticketPriceDollars: z.coerce.number().min(0).max(1_000_000),
  description: z.string().max(2000).optional(),
  timezone: z.string().max(64).default("UTC"),
  audienceMode: z
    .enum([
      "worldwide",
      "us_only",
      "local_priority",
      "local_only",
      "invite_only",
      "subscribers_only",
      "vip_only",
    ])
    .default("worldwide"),
  localPriorityMinutes: z.coerce.number().int().min(0).max(180).default(30),
});
