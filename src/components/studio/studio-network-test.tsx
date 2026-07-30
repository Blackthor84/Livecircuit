"use client";

import { useState } from "react";
import { Activity, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runNetworkTest } from "@/lib/streaming/studio/analysis/network-test";
import { healthStatusBg } from "@/lib/streaming/studio/analysis/stream-health";
import type { NetworkTestResult } from "@/lib/streaming/studio/types";
import { cn } from "@/lib/utils";

type Props = {
  onStable?: () => void;
};

export function StudioNetworkTest({ onStable }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NetworkTestResult | null>(null);

  async function runTest() {
    setLoading(true);
    try {
      const next = await runNetworkTest();
      setResult(next);
      if (next.stable) onStable?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button type="button" size="sm" disabled={loading} onClick={() => void runTest()}>
        <Wifi className="size-4" />
        {loading ? "Testing connection…" : "Run network test"}
      </Button>
      {result ? (
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <Metric label="Latency" value={result.latencyMs !== null ? `${result.latencyMs} ms` : "—"} />
          <Metric label="Upload" value={result.uploadMbps !== null ? `${result.uploadMbps} Mbps` : "—"} />
          <Metric label="Max quality" value={result.maxQuality} />
          <div
            className={cn(
              "rounded-lg border px-3 py-2",
              result.stable ? healthStatusBg("green") : healthStatusBg("yellow")
            )}
          >
            <p className="text-xs text-muted-foreground">Stability</p>
            <p className="font-medium">{result.stable ? "Stable" : "Unstable"}</p>
          </div>
        </div>
      ) : null}
      {result?.warnings.length ? (
        <ul className="space-y-1 text-sm text-amber-200/90">
          {result.warnings.map((warning) => (
            <li key={warning}>• {warning}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Activity className="size-3" />
        {label}
      </p>
      <p className="font-medium capitalize">{value}</p>
    </div>
  );
}
