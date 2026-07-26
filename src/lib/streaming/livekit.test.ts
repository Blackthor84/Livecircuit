import { describe, expect, it } from "vitest";
import { liveKitRoomName } from "@/lib/streaming/livekit";

describe("liveKitRoomName", () => {
  it("returns a stable room name per event", () => {
    const eventId = "550e8400-e29b-41d4-a716-446655440000";
    expect(liveKitRoomName(eventId)).toBe(`lc-event-${eventId}`);
  });
});
