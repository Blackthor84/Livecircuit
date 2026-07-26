"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { countdownParts, type EventLobbyContent } from "@/lib/live/lobby";
import { cn } from "@/lib/utils";

type Props = EventLobbyContent & {
  title: string;
  className?: string;
};

export function PreShowLobby({
  title,
  scheduledAt,
  artistName,
  locationLabel,
  message,
  previewVideoUrl,
  bannerUrl,
  className,
}: Props) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const parts = countdownParts(scheduledAt, now);
  const startingSoon = parts.totalSeconds <= 0;

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-primary/20 via-background to-accent/10",
        className
      )}
    >
      {bannerUrl && !previewVideoUrl ? (
        <Image src={bannerUrl} alt="" fill className="object-cover opacity-40" sizes="100vw" />
      ) : null}
      {previewVideoUrl ? (
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-70"
          src={previewVideoUrl}
          autoPlay
          muted
          loop
          playsInline
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
      <span className="absolute left-4 top-4 rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground">
        Pre-show lobby
      </span>
      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="text-sm uppercase tracking-wide text-white/70">
          {artistName ?? "LiveCircuit"} {locationLabel ? `· ${locationLabel}` : ""}
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{title}</h2>
        {message ? <p className="mt-3 max-w-xl text-sm text-white/80">{message}</p> : null}
        <div className="mt-6 rounded-2xl bg-black/45 px-6 py-4 backdrop-blur">
          <p className="text-xs uppercase tracking-wide text-white/60">
            {startingSoon ? "Starting now" : "Show starts in"}
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-white sm:text-4xl">
            {startingSoon
              ? "Any moment"
              : `${parts.days}d ${parts.hours}h ${parts.minutes}m ${parts.seconds}s`}
          </p>
        </div>
        <p className="mt-4 max-w-md text-sm text-white/70">
          Chat with other fans while you wait. The live stream opens automatically when the artist goes
          live.
        </p>
      </div>
    </div>
  );
}
