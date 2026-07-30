"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConnectionQuality,
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  VideoPresets,
} from "livekit-client";
import { Maximize2, Mic, MicOff, RefreshCw, SwitchCamera, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { buildStreamHealthMetrics } from "@/lib/streaming/studio/analysis/stream-health";
import type { StreamHealthMetrics } from "@/lib/streaming/studio/types";

type Props = {
  eventId: string;
  role: "host" | "audience" | "producer";
  rehearsal?: boolean;
  inviteToken?: string | null;
  onHealthUpdate?: (metrics: StreamHealthMetrics) => void;
  onVideoElement?: (video: HTMLVideoElement | null) => void;
  onAudioStream?: (stream: MediaStream | null) => void;
  onConnected?: () => void;
  className?: string;
};

type ResolutionPreset = "720p" | "1080p";

export function StudioLiveKitRoom({
  eventId,
  role,
  rehearsal = true,
  inviteToken,
  onHealthUpdate,
  onVideoElement,
  onAudioStream,
  onConnected,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [status, setStatus] = useState<"loading" | "connected" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [mirrored, setMirrored] = useState(true);
  const [resolution, setResolution] = useState<ResolutionPreset>("720p");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>("");
  const [retryKey, setRetryKey] = useState(0);

  const attachVideo = useCallback(
    (track: Track) => {
      if (!containerRef.current || track.kind !== Track.Kind.Video) return;
      const element = track.attach() as HTMLVideoElement;
      element.className = cn("h-full w-full object-cover", mirrored && role === "host" && "scale-x-[-1]");
      element.playsInline = true;
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(element);
      onVideoElement?.(element);
    },
    [mirrored, onVideoElement, role]
  );

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      setStatus("loading");
      setMessage(null);

      const endpoint =
        role === "producer"
          ? `/api/stream/${eventId}?role=producer`
          : rehearsal
            ? `/api/stream/rehearsal/${eventId}?role=${role}${inviteToken ? `&token=${encodeURIComponent(inviteToken)}` : ""}`
            : `/api/stream/${eventId}?role=${role}`;

      const response = await fetch(endpoint);
      if (!response.ok) {
        setStatus("error");
        setMessage("Unable to join the studio room.");
        return;
      }

      const credentials = (await response.json()) as {
        provider?: string;
        playbackUrl?: string;
        token?: string;
      };

      if (credentials.provider !== "livekit" || !credentials.playbackUrl || !credentials.token) {
        setStatus("error");
        setMessage("LiveKit credentials unavailable.");
        return;
      }

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track, publication) => {
        if (role === "audience" && publication.track) void attachVideo(track);
      });
      room.on(RoomEvent.LocalTrackPublished, (publication) => {
        if (role === "host" && publication.track) attachVideo(publication.track);
      });
      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        if (state === ConnectionState.Connected) {
          setStatus("connected");
          onConnected?.();
        }
      });

      await room.connect(credentials.playbackUrl, credentials.token);
      if (cancelled) return;

      if (role === "host") {
        const preset = resolution === "1080p" ? VideoPresets.h1080 : VideoPresets.h720;
        await room.localParticipant.setCameraEnabled(true, { resolution: preset });
        await room.localParticipant.setMicrophoneEnabled(true);
        const pubs = room.localParticipant.getTrackPublications();
        for (const pub of pubs) {
          if (pub.track?.mediaStream && pub.source === Track.Source.Microphone) {
            onAudioStream?.(pub.track.mediaStream);
          }
        }
      }
    }

    void connect().catch(() => {
      if (!cancelled) {
        setStatus("error");
        setMessage("Studio connection failed.");
      }
    });

    return () => {
      cancelled = true;
      void roomRef.current?.disconnect();
      roomRef.current = null;
      onVideoElement?.(null);
      onAudioStream?.(null);
    };
  }, [
    attachVideo,
    eventId,
    onAudioStream,
    onConnected,
    onVideoElement,
    rehearsal,
    inviteToken,
    resolution,
    retryKey,
    role,
  ]);

  useEffect(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then((list) => setDevices(list.filter((d) => d.kind === "videoinput")))
      .catch(() => undefined);
  }, [status]);

  useEffect(() => {
    const room = roomRef.current;
    if (!room || status !== "connected") return;

    const interval = window.setInterval(() => {
      const quality = room.localParticipant.connectionQuality as ConnectionQuality;
      const videoPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      const settings = videoPub?.track?.mediaStreamTrack.getSettings();
      const metrics = buildStreamHealthMetrics({
        connectionQuality: quality,
        videoWidth: settings?.width,
        videoHeight: settings?.height,
        frameRate: settings?.frameRate,
        sampleRate: room.localParticipant
          .getTrackPublication(Track.Source.Microphone)
          ?.track?.mediaStreamTrack.getSettings().sampleRate,
      });
      onHealthUpdate?.(metrics);
    }, 1500);

    return () => window.clearInterval(interval);
  }, [onHealthUpdate, status]);

  async function switchCamera(deviceId: string) {
    const room = roomRef.current;
    if (!room) return;
    setActiveCameraId(deviceId);
    await room.switchActiveDevice("videoinput", deviceId);
  }

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

  function toggleFullscreen() {
    containerRef.current?.requestFullscreen?.();
  }

  return (
    <div className={cn("relative aspect-video w-full overflow-hidden rounded-2xl bg-black", className)}>
      <div ref={containerRef} className="h-full w-full" />
      {status === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-white">
          Connecting studio preview…
        </div>
      ) : null}
      {status === "error" && message ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 px-6 text-center text-sm text-white">
          <p>{message}</p>
          <Button type="button" size="sm" variant="secondary" onClick={() => setRetryKey((v) => v + 1)}>
            <RefreshCw className="size-4" />
            Retry
          </Button>
        </div>
      ) : null}
      {status === "connected" && role === "host" ? (
        <div className="absolute bottom-0 left-0 right-0 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent p-3">
          <div className="flex gap-2">
            <Button type="button" size="icon" variant="ghost" className="text-white" onClick={() => void toggleMic()}>
              {micEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />}
            </Button>
            <Button type="button" size="icon" variant="ghost" className="text-white" onClick={() => void toggleCamera()}>
              {cameraEnabled ? <Video className="size-4" /> : <VideoOff className="size-4" />}
            </Button>
            <Button type="button" size="icon" variant="ghost" className="text-white" onClick={toggleFullscreen}>
              <Maximize2 className="size-4" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {devices.length > 1 ? (
              <Select
                value={activeCameraId || devices[0]?.deviceId || "default"}
                onValueChange={(v) => {
                  if (v) void switchCamera(v);
                }}
              >
                <SelectTrigger className="h-8 w-[160px] border-white/20 bg-black/50 text-xs text-white">
                  <SwitchCamera className="mr-1 size-3" />
                  <SelectValue placeholder="Camera" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || "Camera"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Select value={resolution} onValueChange={(v) => setResolution(v as ResolutionPreset)}>
              <SelectTrigger className="h-8 w-[100px] border-white/20 bg-black/50 text-xs text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="720p">720p</SelectItem>
                <SelectItem value="1080p">1080p</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 rounded-md bg-black/50 px-2 py-1">
              <Switch id="mirror" checked={mirrored} onCheckedChange={setMirrored} />
              <Label htmlFor="mirror" className="text-xs text-white">
                Mirror
              </Label>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
