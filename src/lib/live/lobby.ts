import type { StreamMetadata } from "@/lib/streaming/stream-metadata";

export type EventLobbyContent = {
  message: string | null;
  previewVideoUrl: string | null;
  bannerUrl: string | null;
  scheduledAt: string;
  artistName: string | null;
  locationLabel: string | null;
};

export function buildEventLobbyContent(input: {
  scheduledAt: string;
  artistName?: string | null;
  locationLabel?: string | null;
  artistBannerUrl?: string | null;
  tourStopBannerUrl?: string | null;
  metadata?: StreamMetadata;
}): EventLobbyContent {
  const metadata = input.metadata ?? {};
  return {
    scheduledAt: input.scheduledAt,
    artistName: input.artistName ?? null,
    locationLabel: input.locationLabel ?? null,
    message: metadata.lobby_message ?? null,
    previewVideoUrl: metadata.lobby_video_url ?? null,
    bannerUrl:
      metadata.lobby_banner_url ??
      input.tourStopBannerUrl ??
      input.artistBannerUrl ??
      null,
  };
}

export function countdownParts(targetAt: string, now = new Date()) {
  const totalMs = Math.max(0, new Date(targetAt).getTime() - now.getTime());
  const totalSeconds = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, totalMs, totalSeconds };
}
