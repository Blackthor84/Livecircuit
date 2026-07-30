"use client";

import { healthStatusBg, healthStatusColor } from "@/lib/streaming/studio/analysis/stream-health";
import type { StreamHealthMetrics } from "@/lib/streaming/studio/types";
import { cn } from "@/lib/utils";

type Props = {
  metrics: StreamHealthMetrics | null;
};

const ROWS: { key: keyof StreamHealthMetrics; label: string }[] = [
  { key: "latencyMs", label: "Latency" },
  { key: "fps", label: "FPS" },
  { key: "bitrateKbps", label: "Bitrate (kbps)" },
  { key: "packetLossPct", label: "Packet loss (%)" },
  { key: "uploadMbps", label: "Upload (Mbps)" },
  { key: "memoryUsageMb", label: "Memory (MB)" },
  { key: "cameraResolution", label: "Camera resolution" },
  { key: "microphoneSampleRate", label: "Mic sample rate" },
];

export function StudioStreamHealth({ metrics }: Props) {
  if (!metrics) {
    return <p className="text-sm text-muted-foreground">Stream health appears once connected.</p>;
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
          healthStatusBg(metrics.connectionQuality)
        )}
      >
        Connection:{" "}
        <span className={cn("ml-1 capitalize", healthStatusColor(metrics.connectionQuality))}>
          {metrics.connectionQuality}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {ROWS.map(({ key, label }) => {
          const raw = metrics[key];
          const value =
            raw === null || raw === undefined
              ? "—"
              : typeof raw === "number"
                ? key === "microphoneSampleRate"
                  ? `${raw} Hz`
                  : String(raw)
                : String(raw);
          return (
            <div key={key} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-medium">{value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
