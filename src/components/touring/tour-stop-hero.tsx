"use client";

import { Award, Clock, MapPin, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { audienceModeLabel } from "@/lib/virtual-touring/access";
import { skylineAccentForCity } from "@/lib/virtual-touring/constants";
import {
  formatTourStopDate,
  formatTourStopTime,
} from "@/lib/virtual-touring/location";
import type { EventAudienceMode } from "@/types/database";
import { cn } from "@/lib/utils";

export type TourStopHeroProps = {
  tourTitle: string;
  tourCity: string;
  tourStateName: string | null;
  tourStateCode: string | null;
  showStartsAt: string;
  doorsOpenAt: string | null;
  venueName?: string | null;
  venueSlug?: string | null;
  audienceMode?: EventAudienceMode;
  isHomeCrowd?: boolean;
  className?: string;
};

export function TourStopHero({
  tourTitle,
  tourCity,
  tourStateName,
  tourStateCode,
  showStartsAt,
  doorsOpenAt,
  venueName,
  audienceMode = "worldwide",
  isHomeCrowd,
  className,
}: TourStopHeroProps) {
  const accent = skylineAccentForCity(tourCity);
  const stateLabel = tourStateName ?? tourStateCode;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-card/60",
        className
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br", accent)} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/90 to-transparent" />

      <div className="relative px-6 py-8 sm:px-10 sm:py-10">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Radio className="size-3" />
            Tour Stop
          </Badge>
          {isHomeCrowd ? (
            <Badge className="gap-1 bg-emerald-500/90">
              <Award className="size-3" />
              Home Crowd
            </Badge>
          ) : null}
          <Badge variant="outline">{audienceModeLabel(audienceMode)}</Badge>
        </div>

        <p className="mt-4 text-sm font-medium uppercase tracking-widest text-primary/90">
          {tourTitle}
        </p>

        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">
          <span className="flex items-center gap-2">
            <MapPin className="size-8 shrink-0 text-primary sm:size-10" />
            {tourCity}
            {stateLabel ? (
              <span className="text-gradient">{stateLabel}</span>
            ) : null}
          </span>
        </h2>

        <p className="mt-4 text-lg text-muted-foreground">{formatTourStopDate(showStartsAt)}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="glass-panel rounded-xl border border-white/10 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Doors Open</p>
            <p className="mt-1 flex items-center gap-1 font-semibold">
              <Clock className="size-4 text-primary" />
              {doorsOpenAt ? formatTourStopTime(doorsOpenAt) : formatTourStopTime(showStartsAt)}
            </p>
          </div>
          <div className="glass-panel rounded-xl border border-white/10 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Show Starts</p>
            <p className="mt-1 flex items-center gap-1 font-semibold">
              <Clock className="size-4 text-primary" />
              {formatTourStopTime(showStartsAt)}
            </p>
          </div>
          <div className="glass-panel rounded-xl border border-white/10 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Venue</p>
            <p className="mt-1 font-semibold">{venueName ?? "LiveCircuit Arena"}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
