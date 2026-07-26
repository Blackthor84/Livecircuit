"use client";

import { getClientStreamingProviderName, isClientLiveKitConfigured } from "@/lib/config/env";
import { LiveKitPlayer } from "@/components/live/livekit-player";
import { LivePlayerPlaceholder } from "@/components/live/live-room";
import { LiveReactionsOverlay } from "@/components/live/live-reactions-overlay";

type Props = {
  eventId: string;
  title: string;
  status: string;
  role: "host" | "audience";
  canWatchStream: boolean;
  waitingLabel?: string;
  deniedMessage?: string | null;
};

export function LiveStreamStage({
  eventId,
  title,
  status,
  role,
  canWatchStream,
  waitingLabel,
  deniedMessage,
}: Props) {
  const useLiveKit =
    getClientStreamingProviderName() === "livekit" &&
    isClientLiveKitConfigured() &&
    status === "live" &&
    canWatchStream;

  if (useLiveKit) {
    return (
      <div className="relative">
        <LiveKitPlayer eventId={eventId} role={role} />
        <LiveReactionsOverlay eventId={eventId} />
      </div>
    );
  }

  return (
    <div className="relative">
      <LivePlayerPlaceholder
        title={title}
        status={status}
        waitingLabel={waitingLabel}
        deniedMessage={deniedMessage}
      />
      {status === "live" && canWatchStream ? <LiveReactionsOverlay eventId={eventId} /> : null}
    </div>
  );
}
