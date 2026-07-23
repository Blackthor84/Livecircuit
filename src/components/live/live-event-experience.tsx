"use client";

import { useEffect, useMemo, useState } from "react";
import { LiveChat, LivePlayerPlaceholder } from "@/components/live/live-room";
import { LiveHostControls } from "@/components/live/live-host-controls";
import { Button } from "@/components/ui/button";
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
  checkoutHref?: string;
  loginHref?: string;
};

export function LiveEventExperience({
  eventId,
  title,
  initialStatus,
  initialAccess,
  checkoutHref,
  loginHref = "/login",
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [access, setAccess] = useState(initialAccess);
  const [secondsLeft, setSecondsLeft] = useState(initialAccess.secondsUntilStart);
  const [streamNote, setStreamNote] = useState<string | null>(null);

  useEffect(() => {
    setStatus(initialStatus);
    setAccess(initialAccess);
    setSecondsLeft(initialAccess.secondsUntilStart);
  }, [initialStatus, initialAccess]);

  useEffect(() => {
    if (access.mode !== "waiting") return;
    const tick = window.setInterval(() => {
      setSecondsLeft((n) => Math.max(0, n - 1));
    }, 1000);
    return () => window.clearInterval(tick);
  }, [access.mode]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetch(`/api/events/${eventId}/access`)
        .then((r) => r.json())
        .then((data: LiveAccessState) => {
          setAccess(data);
          setStatus(data.status);
          setSecondsLeft(data.secondsUntilStart);
        })
        .catch(() => null);
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [eventId]);

  useEffect(() => {
    if (!access.canWatchStream || status !== "live") return;
    void fetch(`/api/stream/placeholder/${eventId}`)
      .then((r) => r.json())
      .then((data: { playbackUrl?: string; provider?: string }) => {
        if (data.playbackUrl) {
          setStreamNote(`Stream ready (${data.provider ?? "placeholder"})`);
        }
      })
      .catch(() => setStreamNote(null));
  }, [access.canWatchStream, eventId, status]);

  const playerStatus = useMemo(() => {
    if (status === "live") return "live";
    if (access.mode === "waiting") return "waiting";
    return status;
  }, [status, access.mode]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <LivePlayerPlaceholder
          title={title}
          status={playerStatus}
          waitingLabel={
            access.mode === "waiting"
              ? `Waiting room · starts in ${formatCountdown(secondsLeft)}`
              : undefined
          }
          deniedMessage={access.mode === "denied" ? access.message : undefined}
          streamNote={
            access.canWatchStream && status === "live" ? streamNote : undefined
          }
        />
        {access.canModerate ? <LiveHostControls eventId={eventId} status={status} /> : null}
        {access.mode === "denied" && access.message ? (
          <div className="flex flex-wrap gap-2">
            {checkoutHref ? (
              <Button href={checkoutHref}>Get tickets</Button>
            ) : null}
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
