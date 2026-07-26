import { describe, expect, it } from "vitest";
import { buildEventLobbyContent, countdownParts } from "@/lib/live/lobby";

describe("buildEventLobbyContent", () => {
  it("prefers configured lobby assets over tour defaults", () => {
    const lobby = buildEventLobbyContent({
      scheduledAt: "2030-01-01T00:00:00.000Z",
      artistName: "Nova Ray",
      locationLabel: "Studio A",
      artistBannerUrl: "https://example.com/artist.jpg",
      metadata: {
        lobby_message: "Doors open soon",
        lobby_video_url: "https://example.com/preview.mp4",
        lobby_banner_url: "https://example.com/lobby.jpg",
      },
    });

    expect(lobby.message).toBe("Doors open soon");
    expect(lobby.previewVideoUrl).toBe("https://example.com/preview.mp4");
    expect(lobby.bannerUrl).toBe("https://example.com/lobby.jpg");
  });
});

describe("countdownParts", () => {
  it("returns zero when the show time has passed", () => {
    const parts = countdownParts("2020-01-01T00:00:00.000Z", new Date("2025-01-01T00:00:00.000Z"));
    expect(parts.totalSeconds).toBe(0);
  });
});
