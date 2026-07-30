import type { ConnectionQuality } from "livekit-client";
import type { HealthStatus, StreamHealthMetrics } from "@/lib/streaming/studio/types";

function qualityToStatus(quality: ConnectionQuality | undefined): HealthStatus {
  if (quality === "excellent" || quality === "good") return "green";
  if (quality === "poor") return "yellow";
  if (quality === "lost") return "red";
  return "yellow";
}

export function buildStreamHealthMetrics(input: {
  connectionQuality?: ConnectionQuality;
  videoWidth?: number;
  videoHeight?: number;
  frameRate?: number;
  bytesSent?: number;
  packetsLost?: number;
  packetsSent?: number;
  jitter?: number;
  sampleRate?: number;
}): StreamHealthMetrics {
  const packetLossPct =
    input.packetsSent && input.packetsSent > 0
      ? Number(((input.packetsLost ?? 0) / input.packetsSent) * 100).toFixed(2)
      : null;

  const bitrateKbps =
    input.bytesSent !== undefined
      ? Number(((input.bytesSent * 8) / 1000).toFixed(0))
      : null;

  const connectionQuality = qualityToStatus(input.connectionQuality);

  return {
    latencyMs: input.jitter !== undefined ? Math.round(input.jitter * 1000) : null,
    fps: input.frameRate ?? null,
    bitrateKbps,
    packetLossPct: packetLossPct !== null ? Number(packetLossPct) : null,
    droppedFrames: null,
    uploadMbps: bitrateKbps !== null ? Number((bitrateKbps / 1000).toFixed(2)) : null,
    cpuUsagePct: null,
    memoryUsageMb:
      typeof performance !== "undefined" && "memory" in performance
        ? Number(((performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0) / 1_048_576)
        : null,
    cameraResolution:
      input.videoWidth && input.videoHeight ? `${input.videoWidth}×${input.videoHeight}` : null,
    microphoneSampleRate: input.sampleRate ?? null,
    connectionQuality,
  };
}

export function healthStatusColor(status: HealthStatus) {
  if (status === "green") return "text-emerald-400";
  if (status === "yellow") return "text-amber-300";
  return "text-red-400";
}

export function healthStatusBg(status: HealthStatus) {
  if (status === "green") return "bg-emerald-500/15 border-emerald-500/30";
  if (status === "yellow") return "bg-amber-500/15 border-amber-500/30";
  return "bg-red-500/15 border-red-500/30";
}
