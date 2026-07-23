import { z } from "zod";

export const reviewVerificationSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  adminNotes: z.string().max(1000).optional(),
  featureOnDiscover: z.boolean().optional(),
});

export const updateReportSchema = z.object({
  reportId: z.string().uuid(),
  status: z.enum(["reviewing", "resolved", "dismissed"]),
  adminNotes: z.string().max(1000).optional(),
});

export const refundOrderSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});
