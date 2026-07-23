"use client";

import { useEffect, useState } from "react";
import { countdownParts, resolveAwardsCountdown } from "@/lib/services/awards-countdown";

export function AwardsCountdown({
  status,
  votingEndsAt,
  ceremonyAt,
}: {
  status: string;
  votingEndsAt: string;
  ceremonyAt: string;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const resolved = resolveAwardsCountdown(status, votingEndsAt, ceremonyAt, now);
  if (!resolved) return null;

  const parts = countdownParts(resolved.targetAt, now);
  if (parts.totalMs <= 0) return null;

  return (
    <div className="glass-panel rounded-xl p-6 text-center">
      <p className="text-sm uppercase tracking-wide text-muted-foreground">{resolved.label}</p>
      <p className="mt-3 font-mono text-3xl font-bold tabular-nums sm:text-4xl">
        {parts.days}d {parts.hours}h {parts.minutes}m {parts.seconds}s
      </p>
    </div>
  );
}
