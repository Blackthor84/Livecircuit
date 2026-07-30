import { z } from "zod";

export const sendChatMessageSchema = z.object({
  eventId: z.string().uuid(),
  body: z.string().min(1).max(500),
  isVipOnly: z.boolean().optional(),
  channel: z.enum(["global", "local"]).default("global"),
  rehearsalToken: z.string().min(8).max(128).optional(),
});

export const moderateChatSchema = z.object({
  eventId: z.string().uuid(),
  messageId: z.string().uuid().optional(),
  targetUserId: z.string().uuid().optional(),
  action: z.enum(["delete_message", "mute", "ban", "pin", "unpin"]),
  reason: z.string().max(280).optional(),
  muteMinutes: z.coerce.number().int().min(5).max(1440).optional(),
});

export const reportChatSchema = z.object({
  eventId: z.string().uuid(),
  messageId: z.string().uuid(),
  reason: z.string().min(3).max(500),
});

export const eventControlSchema = z.object({
  eventId: z.string().uuid(),
});
