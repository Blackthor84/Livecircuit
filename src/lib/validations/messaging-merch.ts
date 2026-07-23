import { z } from "zod";

export const upsertProductSchema = z.object({
  productId: z.string().uuid().optional(),
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  priceCents: z.coerce.number().int().min(0).max(1_000_000_00),
  productType: z.enum(["physical", "digital"]).default("physical"),
  isDigital: z.boolean().optional(),
  isVipExclusive: z.boolean().optional(),
  inventoryCount: z.coerce.number().int().min(0).nullable().optional(),
  active: z.boolean().optional().default(true),
});

export const deleteProductSchema = z.object({
  productId: z.string().uuid(),
});

export const sendDirectMessageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().min(1).max(2000),
});

export const startConversationSchema = z.object({
  artistId: z.string().uuid(),
});
