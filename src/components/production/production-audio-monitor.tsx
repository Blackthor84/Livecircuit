"use client";

import { useState } from "react";
import { Headphones, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type Props = {
  clipping?: boolean;
  echo?: boolean;
  noise?: boolean;
  micConnected?: boolean;
};

export function ProductionAudioMonitor({
  clipping = false,
  echo = false,
  noise = false,
  micConnected = true,
}: Props) {
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Headphones className="size-4" />
        Fan audio monitor
      </div>
      <p className="text-xs text-muted-foreground">Hear exactly what fans hear.</p>
      <div className="flex items-center gap-2">
        <Button type="button" size="icon" variant="outline" onClick={() => setMuted((v) => !v)}>
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </Button>
        <Progress value={muted ? 0 : volume} className="flex-1" />
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          disabled={muted}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-24"
          aria-label="Monitor volume"
        />
      </div>
      <ul className="space-y-1 text-xs">
        {!micConnected ? (
          <li className="text-red-400">Microphone disconnected</li>
        ) : null}
        {clipping ? <li className="text-red-400">Audio clipping detected</li> : null}
        {echo ? <li className="text-amber-300">Echo detected — artist should use headphones</li> : null}
        {noise ? <li className="text-amber-300">Background noise elevated</li> : null}
        {!clipping && !echo && !noise && micConnected ? (
          <li className={cn("text-emerald-300")}>Audio levels look good</li>
        ) : null}
      </ul>
    </div>
  );
}
