"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LiveChat } from "@/components/live/live-room";
import { LiveHostControls } from "@/components/live/live-host-controls";
import { LiveStreamStage } from "@/components/live/live-stream-stage";
import { Badge } from "@/components/ui/badge";
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
  userSignedIn?: boolean;
  tourCity?: string | null;
};

export function LiveEventExperience({
  eventId,
  title,
  initialStatus,
  initialAccess,
  lobby,
  checkoutHref,
  loginHref = "/login",
  userSignedIn = false,
  tourCity,
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
  }, [access.canModerate, access.canWatchStream, access.mode, eventId, status]);

  const isObserver = access.mode === "observer";

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
        {isObserver ? (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-amber-500/40 text-amber-200">
              Observer mode
            </Badge>
            <span className="text-xs text-muted-foreground">Internal viewing — excluded from public metrics</span>
          </div>
        ) : null}
        {access.isHomeCrowd ? (
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/90">Home Crowd</Badge>
            <span className="text-xs text-muted-foreground">
              Early access and local chat unlocked for {tourCity ?? "this stop"}
            </span>
          </div>
        ) : null}
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
            {!userSignedIn ? (
              <Button variant="outline" href={loginHref}>
                Sign In
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      {access.canChat ? (
        <LiveChat
          eventId={eventId}
          canPost
          canModerate={access.canModerate}
          isVipViewer={access.isVip}
          canAccessLocalChat={Boolean(access.canAccessLocalChat)}
          tourCity={tourCity}
        />
      ) : isObserver ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 text-center text-sm text-muted-foreground">
          <p className="font-medium text-amber-200/90">Observer access</p>
          <p className="mt-2">Chat and reactions are disabled so engagement metrics stay accurate.</p>
        </div>
      ) : (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-white/10 bg-card/80 p-6 text-center text-sm text-muted-foreground">
          {access.message ?? "Chat opens when you have room access."}
        </div>
      )}
    </div>
  );
}
