import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { getLiveKitConfig, isLiveKitConfigured } from "@/lib/config/env";

export function liveKitRoomName(eventId: string) {
  return `lc-event-${eventId}`;
}

export function liveKitRehearsalRoomName(eventId: string) {
  return `lc-rehearsal-${eventId}`;
}

export function getLiveKitRoomService() {
  const config = getLiveKitConfig();
  if (!config) throw new Error("LiveKit is not configured");
  return new RoomServiceClient(config.url, config.apiKey, config.apiSecret);
}

export async function ensureLiveKitRoom(eventId: string, rehearsal = false) {
  const roomName = rehearsal ? liveKitRehearsalRoomName(eventId) : liveKitRoomName(eventId);
  const client = getLiveKitRoomService();
  try {
    await client.createRoom({
      name: roomName,
      emptyTimeout: 60 * 30,
      maxParticipants: rehearsal ? 50 : 10_000,
    });
  } catch {
    /* room may already exist */
  }
  return roomName;
}

export async function deleteLiveKitRoom(eventId: string) {
  if (!isLiveKitConfigured()) return;
  const client = getLiveKitRoomService();
  try {
    await client.deleteRoom(liveKitRoomName(eventId));
  } catch {
    /* room may already be gone */
  }
}

export async function createLiveKitToken(options: {
  eventId: string;
  identity: string;
  name?: string;
  role: "host" | "audience" | "producer";
  rehearsal?: boolean;
}) {
  const config = getLiveKitConfig();
  if (!config) throw new Error("LiveKit is not configured");

  const roomName = options.rehearsal
    ? liveKitRehearsalRoomName(options.eventId)
    : liveKitRoomName(options.eventId);
  const token = new AccessToken(config.apiKey, config.apiSecret, {
    identity: options.identity,
    name: options.name,
    ttl: 60 * 60 * 6,
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: options.role === "host",
    canSubscribe: true,
    canPublishData: options.role !== "audience",
  });

  return token.toJwt();
}
