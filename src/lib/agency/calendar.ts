import {
  addDays,
  addMinutes,
  differenceInMinutes,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";

export type AgencyCalendarEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  color: string | null;
  artist_id: string | null;
  artist_name?: string | null;
  notes?: string | null;
};

export type CalendarConflict = {
  eventAId: string;
  eventBId: string;
  artistId: string | null;
  artistName: string | null;
  overlapMinutes: number;
};

export type CalendarView = "day" | "week" | "month";

export function eventsOverlap(
  a: { starts_at: string; ends_at: string },
  b: { starts_at: string; ends_at: string }
): boolean {
  const aStart = parseISO(a.starts_at).getTime();
  const aEnd = parseISO(a.ends_at).getTime();
  const bStart = parseISO(b.starts_at).getTime();
  const bEnd = parseISO(b.ends_at).getTime();
  return aStart < bEnd && bStart < aEnd;
}

export function overlapMinutes(
  a: { starts_at: string; ends_at: string },
  b: { starts_at: string; ends_at: string }
): number {
  if (!eventsOverlap(a, b)) return 0;
  const start = Math.max(parseISO(a.starts_at).getTime(), parseISO(b.starts_at).getTime());
  const end = Math.min(parseISO(a.ends_at).getTime(), parseISO(b.ends_at).getTime());
  return Math.max(0, Math.round((end - start) / 60000));
}

export function detectCalendarConflicts(events: AgencyCalendarEvent[]): CalendarConflict[] {
  const conflicts: CalendarConflict[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i]!;
      const b = events[j]!;
      if (a.artist_id && b.artist_id && a.artist_id !== b.artist_id) continue;
      if (!eventsOverlap(a, b)) continue;

      const key = [a.id, b.id].sort().join(":");
      if (seen.has(key)) continue;
      seen.add(key);

      conflicts.push({
        eventAId: a.id,
        eventBId: b.id,
        artistId: a.artist_id ?? b.artist_id,
        artistName: a.artist_name ?? b.artist_name ?? null,
        overlapMinutes: overlapMinutes(a, b),
      });
    }
  }

  return conflicts.sort((x, y) => y.overlapMinutes - x.overlapMinutes);
}

export function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: 0 });
  const end = endOfWeek(anchor, { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
}

export function getMonthDays(anchor: Date): Date[] {
  const start = startOfWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1), { weekStartsOn: 0 });
  const end = endOfWeek(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0), { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
}

export function eventPositionInDay(event: AgencyCalendarEvent, day: Date, hourHeight = 48) {
  const dayStart = startOfDay(day);
  const start = parseISO(event.starts_at);
  const end = parseISO(event.ends_at);
  if (!isSameDay(start, day) && !isSameDay(end, day)) {
    if (start < dayStart && end > addDays(dayStart, 1)) {
      return { top: 0, height: 24 * hourHeight };
    }
    return null;
  }

  const visibleStart = start < dayStart ? dayStart : start;
  const visibleEnd = end > addDays(dayStart, 1) ? addDays(dayStart, 1) : end;
  const topMinutes = differenceInMinutes(visibleStart, dayStart);
  const heightMinutes = Math.max(30, differenceInMinutes(visibleEnd, visibleStart));

  return {
    top: (topMinutes / 60) * hourHeight,
    height: (heightMinutes / 60) * hourHeight,
  };
}

export function rescheduleEventToDayHour(
  event: AgencyCalendarEvent,
  targetDay: Date,
  hour: number
): { starts_at: string; ends_at: string } {
  const duration = differenceInMinutes(parseISO(event.ends_at), parseISO(event.starts_at));
  const starts = addMinutes(startOfDay(targetDay), hour * 60);
  const ends = addMinutes(starts, Math.max(duration, 60));
  return { starts_at: starts.toISOString(), ends_at: ends.toISOString() };
}

export function formatCalendarRange(startsAt: string, endsAt: string): string {
  const start = parseISO(startsAt);
  const end = parseISO(endsAt);
  if (isSameDay(start, end)) {
    return `${format(start, "MMM d, h:mm a")} – ${format(end, "h:mm a")}`;
  }
  return `${format(start, "MMM d, h:mm a")} – ${format(end, "MMM d, h:mm a")}`;
}
