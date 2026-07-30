"use client";

import { useEffect, useState } from "react";
import { StudioLightingCheck } from "@/components/studio/studio-lighting-check";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video } from "lucide-react";
import type { StreamHealthMetrics } from "@/lib/streaming/studio/types";

type Props = {
  videoElement: HTMLVideoElement | null;
  health: StreamHealthMetrics | null;
  onAcceptable?: () => void;
};

export function VideoLab({ videoElement, health, onAcceptable }: Props) {
  const [blurWarning, setBlurWarning] = useState(false);

  useEffect(() => {
    if (!health?.cameraResolution) return;
    const [w] = health.cameraResolution.split("×").map(Number);
    setBlurWarning(Boolean(w && w < 640));
  }, [health?.cameraResolution]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="size-4" />
          Video Lab
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <Metric label="Resolution" value={health?.cameraResolution ?? "—"} />
          <Metric label="FPS" value={health?.fps?.toString() ?? "—"} />
          <Metric label="Exposure" value={health ? "Auto" : "—"} />
        </div>
        {blurWarning ? (
          <p className="text-sm text-amber-300">Low resolution — image may appear blurry to fans.</p>
        ) : null}
        <StudioLightingCheck videoElement={videoElement} onAcceptable={onAcceptable} />
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
