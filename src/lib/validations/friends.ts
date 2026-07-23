import { z } from "zod";

export const friendUserIdSchema = z.object({
  userId: z.string().uuid(),
});

export const friendRequestIdSchema = z.object({
  requestId: z.string().uuid(),
});

export const sendFriendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});

export const startFriendChatSchema = z.object({
  peerId: z.string().uuid(),
});

export const createWatchPartySchema = z.object({
  title: z.string().trim().min(2).max(120),
  eventId: z.string().uuid().optional(),
});

export const joinWatchPartySchema = z.object({
  inviteCode: z.string().trim().min(4).max(16),
});

export const watchPartyMessageSchema = z.object({
  partyId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});

export const followUserSchema = z.object({
  userId: z.string().uuid(),
});
