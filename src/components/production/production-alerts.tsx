"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Radio, Wifi } from "lucide-react";
import type { ProductionAlert } from "@/lib/production/types";
import type { StreamHealthMetrics } from "@/lib/streaming/studio/types";
import { cn } from "@/lib/utils";

export function ProductionAlerts({
  health,
  extraAlerts = [],
}: {
  health: StreamHealthMetrics | null;
  extraAlerts?: ProductionAlert[];
}) {
  const [alerts, setAlerts] = useState<ProductionAlert[]>([]);

  useEffect(() => {
    const next: ProductionAlert[] = [...extraAlerts];
    if (!health) return;

    if (health.connectionQuality === "red") {
      next.push({
        id: "conn-red",
        severity: "critical",
        message: "Internet unstable — connection quality is poor.",
        timestamp: Date.now(),
      });
    }
    if (health.packetLossPct !== null && health.packetLossPct > 2) {
      next.push({
        id: "packet-loss",
        severity: "warning",
        message: `Packet loss at ${health.packetLossPct}%`,
        timestamp: Date.now(),
      });
    }
    if (health.latencyMs !== null && health.latencyMs > 200) {
      next.push({
        id: "latency",
        severity: "warning",
        message: `High latency: ${health.latencyMs}ms`,
        timestamp: Date.now(),
      });
    }
    if (health.bitrateKbps !== null && health.bitrateKbps < 800) {
      next.push({
        id: "bitrate",
        severity: "warning",
        message: "Bitrate too low for stable HD.",
        timestamp: Date.now(),
      });
    }

    setAlerts(next);
  }, [extraAlerts, health]);

  if (alerts.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-emerald-300">
        <Wifi className="size-4" />
        All systems nominal
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {alerts.map((alert) => (
        <li
          key={alert.id}
          className={cn(
            "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
            alert.severity === "critical"
              ? "border-red-500/40 bg-red-500/10 text-red-200"
              : alert.severity === "warning"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
                : "border-white/10 bg-black/20"
          )}
        >
          {alert.severity === "critical" ? (
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          ) : (
            <Radio className="mt-0.5 size-4 shrink-0" />
          )}
          {alert.message}
        </li>
      ))}
    </ul>
  );
}
