"use client";

import { getClientStreamingProviderName, isClientLiveKitConfigured } from "@/lib/config/env";
import type { EventLobbyContent } from "@/lib/live/lobby";
import { LiveKitPlayer } from "@/components/live/livekit-player";
import { LivePlayerPlaceholder } from "@/components/live/live-room";
import { LiveReactionsOverlay } from "@/components/live/live-reactions-overlay";
import { PreShowLobby } from "@/components/live/pre-show-lobby";
import { VodPlayer } from "@/components/live/vod-player";

type Props = {
  eventId: string;
  title: string;
  status: string;
  role: "host" | "audience";
  canWatchStream: boolean;
  waitingLabel?: string;
  deniedMessage?: string | null;
  lobby?: EventLobbyContent | null;
  recordingUrl?: string | null;
  recordingStatus?: string;
};

export function LiveStreamStage({
  eventId,
  title,
  status,
  role,
  canWatchStream,
  waitingLabel,
  deniedMessage,
  lobby,
  recordingUrl,
  recordingStatus,
}: Props) {
  if (status === "ended" && (recordingUrl || recordingStatus === "processing")) {
    return (
      <VodPlayer
        title={title}
        recordingUrl={recordingUrl ?? ""}
        recordingStatus={recordingStatus}
      />
    );
  }

  if (status === "waiting" && lobby && canWatchStream === false && !deniedMessage) {
    return <PreShowLobby title={title} {...lobby} />;
  }

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
