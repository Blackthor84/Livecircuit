"use client";

import { useEffect, useRef, useState } from "react";
import { Circle, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AudioLevelAnalyzer, recordAudioClip } from "@/lib/streaming/studio/analysis/audio-analyzer";
import type { AudioAnalysis } from "@/lib/streaming/studio/types";
import { cn } from "@/lib/utils";

type Props = {
  audioStream: MediaStream | null;
  onTested?: () => void;
};

export function StudioAudioCheck({ audioStream, onTested }: Props) {
  const analyzerRef = useRef(new AudioLevelAnalyzer());
  const [analysis, setAnalysis] = useState<AudioAnalysis | null>(null);
  const [recording, setRecording] = useState(false);
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioStream || muted) {
      analyzerRef.current.detach();
      return;
    }
    analyzerRef.current.attach(audioStream);
    const interval = window.setInterval(() => {
      setAnalysis(analyzerRef.current.sample());
    }, 100);
    return () => {
      window.clearInterval(interval);
      analyzerRef.current.detach();
    };
  }, [audioStream, muted]);

  useEffect(() => {
    return () => {
      if (clipUrl) URL.revokeObjectURL(clipUrl);
    };
  }, [clipUrl]);

  async function recordClip() {
    if (!audioStream) return;
    setRecording(true);
    try {
      const blob = await recordAudioClip(audioStream, 10);
      if (clipUrl) URL.revokeObjectURL(clipUrl);
      setClipUrl(URL.createObjectURL(blob));
      onTested?.();
    } finally {
      setRecording(false);
    }
  }

  const level = analysis?.level ?? 0;
  const peak = analysis?.peak ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Microphone level</span>
          <span className={cn(analysis?.isClipping && "text-red-400")}>
            Peak {Math.round(peak * 100)}%
          </span>
        </div>
        <Progress value={level * 100} className="h-3" />
        <div className="mt-1 flex gap-2 text-xs">
          {analysis?.isClipping ? (
            <span className="text-red-400">Clipping detected</span>
          ) : null}
          {analysis?.noiseDetected ? (
            <span className="text-amber-300">Background noise</span>
          ) : null}
          {analysis?.echoWarning ? (
            <span className="text-amber-300">Echo warning — use headphones</span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={muted ? "secondary" : "outline"} onClick={() => setMuted((v) => !v)}>
          {muted ? "Unmute meter" : "Mute meter"}
        </Button>
        <Button type="button" size="sm" disabled={!audioStream || recording} onClick={() => void recordClip()}>
          {recording ? (
            <>
              <Circle className="size-3 animate-pulse text-red-400" />
              Recording…
            </>
          ) : (
            <>
              <Square className="size-3" />
              Record 10s clip
            </>
          )}
        </Button>
        {clipUrl ? (
          <a
            href={clipUrl}
            download="sound-check.webm"
            className="inline-flex h-8 items-center justify-center rounded-lg bg-secondary px-2.5 text-sm font-medium"
          >
            Download clip
          </a>
        ) : null}
      </div>

      {clipUrl ? (
        <div className="rounded-lg border border-white/10 bg-black/30 p-3">
          <p className="mb-2 text-sm font-medium">Playback — hear what fans will hear</p>
          <audio ref={audioRef} controls src={clipUrl} className="w-full" />
          <Button type="button" size="sm" className="mt-2" onClick={() => void audioRef.current?.play()}>
            <Play className="size-4" />
            Play back
          </Button>
        </div>
      ) : null}

      {analysis?.suggestions.length ? (
        <ul className="space-y-1 text-sm text-muted-foreground">
          {analysis.suggestions.map((tip) => (
            <li key={tip}>• {tip}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
