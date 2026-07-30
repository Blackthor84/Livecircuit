"use client";

import { StudioAudioCheck } from "@/components/studio/studio-audio-check";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic2 } from "lucide-react";

type Props = {
  audioStream: MediaStream | null;
  onTested?: () => void;
};

export function AudioLab({ audioStream, onTested }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic2 className="size-4" />
          Audio Lab
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Mic meter, peak detection, clipping, noise floor, and 10-second record/playback. Producers
          hear the same playback in the Production Booth.
        </p>
        <StudioAudioCheck audioStream={audioStream} onTested={onTested} />
      </CardContent>
    </Card>
  );
}
