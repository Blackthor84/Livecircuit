export type StreamCredentials = {
  playbackUrl: string;
  ingestUrl?: string;
  streamKey?: string;
  token?: string;
  provider: string;
};

export interface StreamingProvider {
  readonly name: string;
  createStream(eventId: string): Promise<{ externalStreamId: string }>;
  getViewerCredentials(
    eventId: string,
    userId: string,
    role: "host" | "audience"
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
    role: "host" | "audience"
  ): Promise<StreamCredentials> {
    return {
      provider: this.name,
      playbackUrl: `/api/stream/placeholder/${eventId}?role=${role}`,
      ingestUrl: role === "host" ? `rtmp://stream.livecircuit.app/live/${eventId}` : undefined,
      streamKey: role === "host" ? `lc_${eventId.slice(0, 8)}` : undefined,
    };
  }

  async endStream(_eventId: string) {
    return;
  }
}

export function getStreamingProvider(): StreamingProvider {
  const provider = process.env.STREAMING_PROVIDER ?? "placeholder";
  switch (provider) {
    case "placeholder":
    default:
      return new PlaceholderStreamingProvider();
  }
}
