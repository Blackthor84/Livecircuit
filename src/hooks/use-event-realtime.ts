"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { EventStatus } from "@/types/database";

type Props = {
  eventId: string;
  initialStatus: EventStatus;
  onStatusChange?: (status: EventStatus) => void;
};

export function useEventRealtime({ eventId, initialStatus, onStatusChange }: Props) {
  const [status, setStatus] = useState<EventStatus>(initialStatus);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState<number | null>(null);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`event-status-${eventId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "events", filter: `id=eq.${eventId}` },
        (payload) => {
          const row = payload.new as {
            status?: EventStatus;
            started_at?: string | null;
            viewer_count?: number;
          };
          if (row.status) {
            setStatus(row.status);
            onStatusChange?.(row.status);
          }
          if (row.started_at !== undefined) setStartedAt(row.started_at);
          if (typeof row.viewer_count === "number") setViewerCount(row.viewer_count);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId, onStatusChange]);

  return { status, startedAt, viewerCount, setStatus };
}
