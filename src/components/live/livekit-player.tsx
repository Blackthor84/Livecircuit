"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, MonitorUp, Video, VideoOff } from "lucide-react";
import { ConnectionState, Room, RoomEvent, Track } from "livekit-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  eventId: string;
  role: "host" | "audience";
  className?: string;
};

export function LiveKitPlayer({ eventId, role, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [status, setStatus] = useState<"loading" | "connected" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  const attachVideo = useCallback(async (track: Track) => {
    if (!containerRef.current || track.kind !== Track.Kind.Video) return;
    const element = track.attach();
    element.className = "h-full w-full object-cover";
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(element);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      setStatus("loading");
      setMessage(null);

      const response = await fetch(`/api/stream/${eventId}?role=${role}`);
      if (!response.ok) {
        setStatus("error");
        setMessage("Unable to join the live stream.");
        return;
      }

      const credentials = (await response.json()) as {
        provider?: string;
        playbackUrl?: string;
        token?: string;
      };

      if (credentials.provider !== "livekit" || !credentials.playbackUrl || !credentials.token) {
        setStatus("error");
        setMessage("LiveKit stream credentials are unavailable.");
        return;
      }

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track, publication) => {
        if (role === "audience" && !publication.trackName?.includes("screen")) {
          void attachVideo(track);
        }
        if (role === "audience" && publication.source === Track.Source.ScreenShare) {
          void attachVideo(track);
        }
      });
      room.on(RoomEvent.LocalTrackPublished, (publication) => {
        if (role === "host" && publication.track) void attachVideo(publication.track);
      });
      room.on(RoomEvent.LocalTrackUnpublished, () => {
        if (role === "host" && containerRef.current) containerRef.current.innerHTML = "";
      });
      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        if (state === ConnectionState.Connected) setStatus("connected");
      });

      await room.connect(credentials.playbackUrl, credentials.token);
      if (cancelled) return;

      if (role === "host") {
        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);
      }
    }

    void connect().catch(() => {
      if (!cancelled) {
        setStatus("error");
        setMessage("Connection to LiveKit failed.");
      }
    });

    return () => {
      cancelled = true;
      void roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, [attachVideo, eventId, role]);

  async function toggleMic() {
    const room = roomRef.current;
    if (!room) return;
    const next = !micEnabled;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicEnabled(next);
  }

  async function toggleCamera() {
    const room = roomRef.current;
    if (!room) return;
    const next = !cameraEnabled;
    await room.localParticipant.setCameraEnabled(next);
    setCameraEnabled(next);
  }

  async function toggleScreenShare() {
    const room = roomRef.current;
    if (!room) return;
    if (screenSharing) {
      await room.localParticipant.setScreenShareEnabled(false);
      setScreenSharing(false);
      return;
    }
    await room.localParticipant.setScreenShareEnabled(true);
    setScreenSharing(true);
  }

  return (
    <div className={cn("relative aspect-video w-full overflow-hidden rounded-2xl bg-black", className)}>
      <div ref={containerRef} className="h-full w-full" />
      {status === "connected" && role === "host" ? (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-black/60 p-2 backdrop-blur">
          <Button type="button" size="icon" variant="ghost" className="text-white hover:bg-white/10" onClick={() => void toggleMic()}>
            {micEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />}
          </Button>
          <Button type="button" size="icon" variant="ghost" className="text-white hover:bg-white/10" onClick={() => void toggleCamera()}>
            {cameraEnabled ? <Video className="size-4" /> : <VideoOff className="size-4" />}
          </Button>
          <Button type="button" size="icon" variant="ghost" className="text-white hover:bg-white/10" onClick={() => void toggleScreenShare()}>
            <MonitorUp className={cn("size-4", screenSharing && "text-primary")} />
          </Button>
        </div>
      ) : null}
      {status === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm text-white">
          Connecting to live stream…
        </div>
      ) : null}
      {status === "error" && message ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-6 text-center text-sm text-white">
          {message}
        </div>
      ) : null}
    </div>
  );
}
