import { getLiveKitConfig, getStreamingProviderName, isLiveKitConfigured } from "@/lib/config/env";
import {
  createLiveKitToken,
  deleteLiveKitRoom,
  ensureLiveKitRoom,
  liveKitRehearsalRoomName,
  liveKitRoomName,
} from "@/lib/streaming/livekit";

export type StreamCredentials = {
  playbackUrl: string;
  ingestUrl?: string;
  streamKey?: string;
  token?: string;
  provider: string;
  roomName?: string;
};

export interface StreamingProvider {
  readonly name: string;
  createStream(eventId: string): Promise<{ externalStreamId: string }>;
  getViewerCredentials(
    eventId: string,
    userId: string,
    role: "host" | "audience" | "producer",
    options?: { rehearsal?: boolean }
  ): Promise<StreamCredentials>;
  endStream(eventId: string): Promise<void>;
}

/** Placeholder until Agora, LiveKit, or Mux is configured. */
export class PlaceholderStreamingProvider implements StreamingProvider {
  readonly name = "placeholder";

  async createStream(eventId: string) {
    return { externalStreamId: `placeholder-${eventId}` };
  }

  async getViewerCredentials(
    eventId: string,
    _userId: string,
    role: "host" | "audience" | "producer",
    options?: { rehearsal?: boolean }
  ): Promise<StreamCredentials> {
    return {
      provider: this.name,
      playbackUrl: `/api/stream/${eventId}?role=${role}${options?.rehearsal ? "&rehearsal=1" : ""}`,
      ingestUrl: role === "host" ? `rtmp://stream.livecircuit.app/live/${eventId}` : undefined,
      streamKey: role === "host" ? `lc_${eventId.slice(0, 8)}` : undefined,
    };
  }

  async endStream(_eventId: string) {
    return;
  }
}

export class LiveKitStreamingProvider implements StreamingProvider {
  readonly name = "livekit";

  async createStream(eventId: string) {
    const roomName = await ensureLiveKitRoom(eventId);
    return { externalStreamId: roomName };
  }

  async getViewerCredentials(
    eventId: string,
    userId: string,
    role: "host" | "audience" | "producer",
    options?: { rehearsal?: boolean }
  ): Promise<StreamCredentials> {
    const config = getLiveKitConfig();
    if (!config) throw new Error("LiveKit is not configured");

    if (role === "host") {
      await ensureLiveKitRoom(eventId, options?.rehearsal);
    }

    const tokenRole = role === "producer" ? "producer" : role === "host" ? "host" : "audience";
    const token = await createLiveKitToken({
      eventId,
      identity: userId,
      role: tokenRole,
      rehearsal: options?.rehearsal,
    });

    const roomName = options?.rehearsal
      ? liveKitRehearsalRoomName(eventId)
      : liveKitRoomName(eventId);

    return {
      provider: this.name,
      playbackUrl: config.url,
      token,
      roomName,
    };
  }

  async endStream(eventId: string) {
    await deleteLiveKitRoom(eventId);
  }
}

export function getStreamingProvider(): StreamingProvider {
  const provider = getStreamingProviderName();
  switch (provider) {
    case "livekit":
      if (isLiveKitConfigured()) return new LiveKitStreamingProvider();
      return new PlaceholderStreamingProvider();
    case "agora":
    case "mux":
      return new PlaceholderStreamingProvider();
    case "placeholder":
    default:
      if (isLiveKitConfigured()) return new LiveKitStreamingProvider();
      return new PlaceholderStreamingProvider();
  }
}
