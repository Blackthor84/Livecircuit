"use client";

import { useEffect, useState } from "react";

function formatCountdown(ms: number) {
  if (ms <= 0) return "Starting soon";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function EventCountdown({ scheduledAt }: { scheduledAt: string }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    function tick() {
      setLabel(formatCountdown(new Date(scheduledAt).getTime() - Date.now()));
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [scheduledAt]);

  return (
    <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
      {label}
    </span>
  );
}
