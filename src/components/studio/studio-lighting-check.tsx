"use client";

import { useEffect, useState } from "react";
import { analyzeVideoFrame } from "@/lib/streaming/studio/analysis/lighting-analyzer";
import { healthStatusBg, healthStatusColor } from "@/lib/streaming/studio/analysis/stream-health";
import type { LightingAnalysis } from "@/lib/streaming/studio/types";
import { cn } from "@/lib/utils";

type Props = {
  videoElement: HTMLVideoElement | null;
  onAcceptable?: () => void;
};

export function StudioLightingCheck({ videoElement, onAcceptable }: Props) {
  const [analysis, setAnalysis] = useState<LightingAnalysis | null>(null);

  useEffect(() => {
    if (!videoElement) return;
    const interval = window.setInterval(() => {
      const next = analyzeVideoFrame(videoElement);
      setAnalysis(next);
      if (next.status === "green") onAcceptable?.();
    }, 2000);
    return () => window.clearInterval(interval);
  }, [onAcceptable, videoElement]);

  if (!videoElement) {
    return <p className="text-sm text-muted-foreground">Connect your camera to run lighting analysis.</p>;
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "inline-flex rounded-full border px-3 py-1 text-xs font-medium capitalize",
          analysis ? healthStatusBg(analysis.status) : "border-white/10"
        )}
      >
        Status:{" "}
        <span className={cn("ml-1", analysis && healthStatusColor(analysis.status))}>
          {analysis?.status ?? "analyzing"}
        </span>
      </div>
      <ul className="space-y-1 text-sm text-muted-foreground">
        {(analysis?.suggestions ?? ["Analyzing lighting…"]).map((tip) => (
          <li key={tip}>• {tip}</li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Brightness score: {analysis ? Math.round(analysis.brightness * 100) : "—"}%
        {analysis?.faceCentered ? " · Face centered" : ""}
      </p>
    </div>
  );
}
