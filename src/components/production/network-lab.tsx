"use client";

import { useState } from "react";
import { Wifi } from "lucide-react";
import { StudioNetworkTest } from "@/components/studio/studio-network-test";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  onStable?: () => void;
};

export function NetworkLab({ onStable }: Props) {
  const [quality, setQuality] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="size-4" />
          Network Lab
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload speed, latency, packet loss, and quality recommendation (720p / 1080p / 1440p / 4K).
        </p>
        <StudioNetworkTest
          onStable={() => {
            setQuality("1080p recommended");
            onStable?.();
          }}
        />
        {quality ? <p className="text-sm text-emerald-300">{quality}</p> : null}
      </CardContent>
    </Card>
  );
}
