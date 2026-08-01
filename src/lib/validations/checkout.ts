import { z } from "zod";

export const checkoutBodySchema = z.object({
  type: z.enum(["ticket", "merch", "tip", "vip", "digital", "festival", "tour_pass"]),
  eventId: z.string().uuid().optional(),
  tourStopId: z.string().uuid().optional(),
  tourId: z.string().uuid().optional(),
  productId: z.string().max(128).optional(),
  artistId: z.string().uuid().optional(),
  artistSlug: z.string().max(64).optional(),
  festivalTierId: z.string().uuid().optional(),
  tier: z.enum(["general", "vip"]).optional().default("general"),
  tipAmountCents: z.coerce.number().int().min(100).max(500_00).optional(),
  tipMessage: z.string().max(280).optional(),
  quantity: z.coerce.number().int().min(1).max(20).optional().default(1),
});

export type CheckoutBody = z.infer<typeof checkoutBodySchema>;

export const checkoutPreviewQuerySchema = z.object({
  type: z.enum(["ticket", "merch", "tip", "vip", "digital", "festival", "tour_pass"]),
  event: z.string().uuid().optional(),
  tourStop: z.string().uuid().optional(),
  tour: z.string().uuid().optional(),
  product: z.string().max(128).optional(),
  artist: z.string().max(64).optional(),
  artistId: z.string().uuid().optional(),
  festivalTier: z.string().uuid().optional(),
  tier: z.enum(["general", "vip"]).optional(),
  tipAmountCents: z.coerce.number().int().min(100).max(500_00).optional(),
  quantity: z.coerce.number().int().min(1).max(20).optional(),
});

export function previewQueryToBody(
  query: z.infer<typeof checkoutPreviewQuerySchema>
): CheckoutBody {
  return {
    type: query.type,
    eventId: query.event,
    tourStopId: query.tourStop,
    tourId: query.tour,
    productId: query.product,
    artistSlug: query.artist,
    artistId: query.artistId,
    festivalTierId: query.festivalTier,
    tier: query.tier ?? "general",
    tipAmountCents: query.tipAmountCents,
    quantity: query.quantity ?? 1,
  };
}
