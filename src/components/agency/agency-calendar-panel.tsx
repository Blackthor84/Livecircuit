"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { addDays, addWeeks, format, parseISO, subWeeks } from "date-fns";
import { AlertTriangle, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAgencyCalendarEventAction,
  deleteAgencyCalendarEventAction,
  updateAgencyCalendarEventAction,
} from "@/lib/actions/agency-features";
import {
  detectCalendarConflicts,
  formatCalendarRange,
  getWeekDays,
  rescheduleEventToDayHour,
  type AgencyCalendarEvent,
  type CalendarView,
} from "@/lib/agency/calendar";
import type { AgencyManagedArtist } from "@/lib/agency/types";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 44;

export function AgencyCalendarPanel({
  orgId,
  events: initialEvents,
  roster,
}: {
  orgId: string;
  events: AgencyCalendarEvent[];
  roster: AgencyManagedArtist[];
}) {
  const [events, setEvents] = useState(initialEvents);
  const [view, setView] = useState<CalendarView>("week");
  const [anchor, setAnchor] = useState(new Date());
  const [pending, startTransition] = useTransition();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newArtistId, setNewArtistId] = useState("");

  const conflicts = useMemo(() => detectCalendarConflicts(events), [events]);
  const weekDays = useMemo(() => getWeekDays(anchor), [anchor]);
  const conflictIds = useMemo(
    () => new Set(conflicts.flatMap((c) => [c.eventAId, c.eventBId])),
    [conflicts]
  );

  function shiftAnchor(delta: number) {
    setAnchor((current) => (view === "week" ? addWeeks(current, delta) : addDays(current, delta)));
  }

  async function handleDrop(day: Date, hour: number, eventId: string) {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;

    const rescheduled = rescheduleEventToDayHour(event, day, hour);
    const updated = events.map((e) => (e.id === eventId ? { ...e, ...rescheduled } : e));
    const nextConflicts = detectCalendarConflicts(updated);

    if (nextConflicts.length) {
      toast.error(`Conflict: ${nextConflicts[0]!.overlapMinutes} min overlap`);
      return;
    }

    setEvents(updated);
    startTransition(async () => {
      const result = await updateAgencyCalendarEventAction({
        orgId,
        eventId,
        startsAt: rescheduled.starts_at,
        endsAt: rescheduled.ends_at,
      });
      if (!result.ok) {
        toast.error(result.error);
        setEvents(initialEvents);
      } else toast.success("Event rescheduled");
    });
  }

  async function createEvent() {
    if (!newTitle.trim()) {
      toast.error("Title required");
      return;
    }
    const starts = new Date(anchor);
    starts.setHours(19, 0, 0, 0);
    const ends = new Date(starts);
    ends.setHours(21, 0, 0, 0);

    startTransition(async () => {
      const result = await createAgencyCalendarEventAction({
        orgId,
        title: newTitle.trim(),
        startsAt: starts.toISOString(),
        endsAt: ends.toISOString(),
        artistId: newArtistId || undefined,
      });
      if (!result.ok) toast.error(result.error);
      else {
        toast.success("Event created");
        setShowCreate(false);
        setNewTitle("");
        window.location.reload();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" size="icon" variant="outline" onClick={() => shiftAnchor(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[180px] text-center font-medium">
            {view === "week"
              ? `${format(weekDays[0]!, "MMM d")} – ${format(weekDays[6]!, "MMM d, yyyy")}`
              : format(anchor, "MMMM d, yyyy")}
          </span>
          <Button type="button" size="icon" variant="outline" onClick={() => shiftAnchor(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["day", "week", "month"] as CalendarView[]).map((v) => (
            <Button
              key={v}
              type="button"
              size="sm"
              variant={view === v ? "default" : "outline"}
              onClick={() => setView(v)}
              className="capitalize"
            >
              {v}
            </Button>
          ))}
          <Button type="button" size="sm" onClick={() => setShowCreate((s) => !s)}>
            <Plus className="size-4" /> Add event
          </Button>
        </div>
      </div>

      {conflicts.length > 0 ? (
        <Card className="glass-panel border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 py-4 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
            <div>
              <p className="font-medium text-amber-200">{conflicts.length} schedule conflict(s)</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {conflicts.slice(0, 3).map((c) => (
                  <li key={`${c.eventAId}-${c.eventBId}`}>
                    {c.artistName ?? "Shared calendar"} — {c.overlapMinutes} min overlap
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showCreate ? (
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="text-base">New calendar event</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Artist</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={newArtistId}
                onChange={(e) => setNewArtistId(e.target.value)}
              >
                <option value="">Agency-wide</option>
                {roster
                  .filter((r) => r.status === "active")
                  .map((r) => (
                    <option key={r.artist_id} value={r.artist_id}>
                      {r.artists?.stage_name}
                    </option>
                  ))}
              </select>
            </div>
            <Button type="button" disabled={pending} onClick={() => void createEvent()}>
              Save event
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {view === "month" ? (
        <Card className="glass-panel border-white/10">
          <CardContent className="py-6">
            <ul className="space-y-2">
              {events.map((event) => (
                <li
                  key={event.id}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 ${
                    conflictIds.has(event.id) ? "border-amber-500/40 bg-amber-500/5" : "border-white/10"
                  }`}
                >
                  <div>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.artist_name ? `${event.artist_name} · ` : ""}
                      {formatCalendarRange(event.starts_at, event.ends_at)}
                    </p>
                  </div>
                  {conflictIds.has(event.id) ? <Badge variant="outline">Conflict</Badge> : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <div
            className="grid min-w-[900px]"
            style={{ gridTemplateColumns: `64px repeat(${view === "day" ? 1 : 7}, minmax(120px, 1fr))` }}
          >
            <div className="border-b border-r border-white/10 bg-white/[0.02] p-2 text-xs text-muted-foreground">
              Time
            </div>
            {(view === "day" ? [anchor] : weekDays).map((day) => (
              <div
                key={day.toISOString()}
                className="border-b border-white/10 bg-white/[0.02] p-2 text-center text-xs font-medium"
              >
                {format(day, "EEE M/d")}
              </div>
            ))}

            {HOURS.map((hour) => (
              <Fragment key={`hour-row-${hour}`}>
                <div
                  className="border-r border-white/10 px-2 py-0 text-[10px] text-muted-foreground"
                  style={{ height: HOUR_HEIGHT }}
                >
                  {format(new Date().setHours(hour, 0, 0, 0), "ha")}
                </div>
                {(view === "day" ? [anchor] : weekDays).map((day) => (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className="relative border-b border-r border-white/5"
                    style={{ height: HOUR_HEIGHT }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggingId) void handleDrop(day, hour, draggingId);
                      setDraggingId(null);
                    }}
                  >
                    {events
                      .filter((event) => {
                        const start = parseISO(event.starts_at);
                        return start.getHours() === hour && format(start, "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
                      })
                      .map((event) => (
                        <div
                          key={event.id}
                          draggable
                          onDragStart={() => setDraggingId(event.id)}
                          onDragEnd={() => setDraggingId(null)}
                          className={`absolute inset-x-1 z-10 cursor-grab overflow-hidden rounded-md border px-2 py-1 text-[11px] active:cursor-grabbing ${
                            conflictIds.has(event.id)
                              ? "border-amber-400/50 bg-amber-500/20"
                              : "border-primary/40 bg-primary/15"
                          }`}
                          style={{
                            backgroundColor: event.color ? `${event.color}33` : undefined,
                            borderColor: event.color ?? undefined,
                            minHeight: 36,
                          }}
                          title={formatCalendarRange(event.starts_at, event.ends_at)}
                        >
                          <p className="truncate font-medium">{event.title}</p>
                          {event.artist_name ? (
                            <p className="truncate text-[10px] opacity-80">{event.artist_name}</p>
                          ) : null}
                        </div>
                      ))}
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {events.slice(0, 8).map((event) => (
          <Button
            key={`del-${event.id}`}
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteAgencyCalendarEventAction({ orgId, eventId: event.id });
                if (!result.ok) toast.error(result.error);
                else {
                  setEvents((current) => current.filter((e) => e.id !== event.id));
                  toast.success("Event deleted");
                }
              })
            }
          >
            Delete {event.title}
          </Button>
        ))}
      </div>
    </div>
  );
}
