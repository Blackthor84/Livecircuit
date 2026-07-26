"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LiveChat } from "@/components/live/live-room";
import { LiveHostControls } from "@/components/live/live-host-controls";
import { LiveStreamStage } from "@/components/live/live-stream-stage";
import { Button } from "@/components/ui/button";
import { useEventRealtime } from "@/hooks/use-event-realtime";
import type { EventLobbyContent } from "@/lib/live/lobby";
import { recordViewerJoin } from "@/lib/actions/live-event";
import type { LiveAccessState } from "@/lib/live/access";
import type { EventStatus } from "@/types/database";

function formatCountdown(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Props = {
  eventId: string;
  title: string;
  initialStatus: EventStatus;
  initialAccess: LiveAccessState;
  lobby?: EventLobbyContent | null;
  checkoutHref?: string;
  loginHref?: string;
};

export function LiveEventExperience({
  eventId,
  title,
  initialStatus,
  initialAccess,
  lobby,
  checkoutHref,
  loginHref = "/login",
}: Props) {
  const [access, setAccess] = useState(initialAccess);
  const [secondsLeft, setSecondsLeft] = useState(initialAccess.secondsUntilStart);

  const onStatusChange = useCallback((next: EventStatus) => {
    setAccess((prev) => {
      const goingLive = next === "live" && prev.mode === "waiting" && prev.hasTicket;
      if (goingLive) {
        return {
          ...prev,
          status: next,
          mode: "viewer",
          canWatchStream: true,
        };
      }
      return { ...prev, status: next };
    });
  }, []);

  const { status } = useEventRealtime({
    eventId,
    initialStatus,
    onStatusChange,
  });

  useEffect(() => {
    setAccess(initialAccess);
    setSecondsLeft(initialAccess.secondsUntilStart);
  }, [initialAccess]);

  useEffect(() => {
    if (status === "live" && access.mode === "waiting" && access.hasTicket) {
      setAccess((prev) => ({
        ...prev,
        status: "live",
        mode: "viewer",
        canWatchStream: true,
      }));
    }
  }, [access.hasTicket, access.mode, status]);

  useEffect(() => {
    if (access.mode !== "waiting") return;
    const tick = window.setInterval(() => {
      setSecondsLeft((n) => Math.max(0, n - 1));
    }, 1000);
    return () => window.clearInterval(tick);
  }, [access.mode]);

  useEffect(() => {
    if (status !== "live" || !access.canWatchStream || access.canModerate) return;
    void recordViewerJoin(eventId);
  }, [access.canModerate, access.canWatchStream, eventId, status]);

  const playerStatus = useMemo(() => {
    if (access.mode === "replay") return "ended";
    if (status === "live") return "live";
    if (access.mode === "waiting") return "waiting";
    return status;
  }, [status, access.mode]);

  const streamRole = access.canModerate ? "host" : "audience";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <LiveStreamStage
          eventId={eventId}
          title={title}
          status={playerStatus}
          role={streamRole}
          canWatchStream={access.canWatchStream}
          waitingLabel={
            access.mode === "waiting"
              ? `Waiting room · starts in ${formatCountdown(secondsLeft)}`
              : undefined
          }
          deniedMessage={access.mode === "denied" ? access.message : undefined}
          lobby={lobby}
          recordingUrl={access.recordingUrl}
          recordingStatus={access.recordingStatus}
        />
        {access.canModerate ? <LiveHostControls eventId={eventId} status={status} /> : null}
        {access.mode === "denied" && access.message ? (
          <div className="flex flex-wrap gap-2">
            {checkoutHref ? <Button href={checkoutHref}>Get tickets</Button> : null}
            <Button variant="outline" href={loginHref}>
              Sign in
            </Button>
          </div>
        ) : null}
      </div>
      {access.canChat ? (
        <LiveChat
          eventId={eventId}
          canPost
          canModerate={access.canModerate}
          isVipViewer={access.isVip}
        />
      ) : (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-white/10 bg-card/80 p-6 text-center text-sm text-muted-foreground">
          {access.message ?? "Chat opens when you have room access."}
        </div>
      )}
    </div>
  );
}
