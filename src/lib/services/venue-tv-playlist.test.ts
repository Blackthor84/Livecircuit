import { describe, expect, it } from "vitest";
import { pickNowPlayingIndex, rotateUpNext } from "@/lib/services/venue-tv-playlist";
import type { VenueTvProgram } from "@/lib/types/venue-tv";

const lineup: VenueTvProgram[] = [
  { id: "1", programType: "trailer", title: "A", summary: "", mediaUrl: null, thumbnailUrl: null, linkHref: null, durationSeconds: 120 },
  { id: "2", programType: "highlight", title: "B", summary: "", mediaUrl: null, thumbnailUrl: null, linkHref: null, durationSeconds: 180 },
];

describe("pickNowPlayingIndex", () => {
  it("returns in range", () => {
    const idx = pickNowPlayingIndex(lineup, new Date("2025-07-22T12:00:00.000Z"));
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(lineup.length);
  });
});

describe("rotateUpNext", () => {
  it("wraps queue", () => {
    const next = rotateUpNext(lineup, 1, 2);
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe("1");
  });
});
