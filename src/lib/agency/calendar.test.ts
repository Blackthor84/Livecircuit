import { describe, expect, it } from "vitest";
import {
  detectCalendarConflicts,
  eventsOverlap,
  overlapMinutes,
  rescheduleEventToDayHour,
} from "@/lib/agency/calendar";

describe("agency calendar", () => {
  const base = {
    id: "1",
    title: "Show A",
    starts_at: "2026-08-01T19:00:00.000Z",
    ends_at: "2026-08-01T21:00:00.000Z",
    color: "#6366f1",
    artist_id: "artist-1",
    artist_name: "Artist One",
  };

  it("detects overlapping events for same artist", () => {
    const other = {
      ...base,
      id: "2",
      title: "Show B",
      starts_at: "2026-08-01T20:00:00.000Z",
      ends_at: "2026-08-01T22:00:00.000Z",
    };
    expect(eventsOverlap(base, other)).toBe(true);
    expect(overlapMinutes(base, other)).toBe(60);
    const conflicts = detectCalendarConflicts([base, other]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.overlapMinutes).toBe(60);
  });

  it("ignores overlaps for different artists", () => {
    const other = {
      ...base,
      id: "2",
      artist_id: "artist-2",
      starts_at: "2026-08-01T20:00:00.000Z",
      ends_at: "2026-08-01T22:00:00.000Z",
    };
    expect(detectCalendarConflicts([base, other])).toHaveLength(0);
  });

  it("reschedules event to target day and hour", () => {
    const day = new Date("2026-08-05T12:00:00.000Z");
    const rescheduled = rescheduleEventToDayHour(base, day, 18);
    expect(rescheduled.starts_at).toContain("2026-08-05");
    expect(new Date(rescheduled.ends_at).getTime()).toBeGreaterThan(new Date(rescheduled.starts_at).getTime());
  });
});
