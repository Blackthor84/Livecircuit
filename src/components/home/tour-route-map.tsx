"use client";

import { motion } from "framer-motion";
import { Check, MapPin, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_TOUR_ROUTE } from "@/lib/home/digital-touring-content";

type StopStatus = "completed" | "live" | "next" | "upcoming";

export type TourRouteStop = {
  city: string;
  state?: string;
  status: StopStatus;
};

type Props = {
  tourName?: string;
  artistName?: string;
  stops?: TourRouteStop[];
  className?: string;
};

function StopBadge({ status }: { status: StopStatus }) {
  if (status === "completed") {
    return (
      <span className="flex size-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (status === "live") {
    return (
      <span className="relative flex size-7 items-center justify-center rounded-full bg-red-500/20 text-red-400">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400/40" />
        <Radio className="relative size-3.5" />
      </span>
    );
  }
  if (status === "next") {
    return (
      <span className="flex size-7 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-xs font-bold text-primary">
        →
      </span>
    );
  }
  return (
    <span className="flex size-7 items-center justify-center rounded-full border border-white/20 bg-white/5 text-muted-foreground">
      <MapPin className="size-3" />
    </span>
  );
}

function statusLabel(status: StopStatus) {
  switch (status) {
    case "completed":
      return "Completed";
    case "live":
      return "● LIVE";
    case "next":
      return "Next";
    default:
      return "Upcoming";
  }
}

export function TourRouteMap({
  tourName = DEMO_TOUR_ROUTE.tourName,
  artistName = DEMO_TOUR_ROUTE.artistName,
  stops = [...DEMO_TOUR_ROUTE.stops],
  className,
}: Props) {
  return (
    <div className={cn("glass-panel overflow-hidden rounded-3xl border border-primary/20 p-6 sm:p-8", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Live tour progress</p>
          <h3 className="mt-1 text-xl font-bold">{tourName}</h3>
          <p className="text-sm text-muted-foreground">{artistName}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {stops.filter((s) => s.status === "completed").length} stops completed ·{" "}
          {stops.filter((s) => s.status === "upcoming" || s.status === "next").length} remaining
        </p>
      </div>

      <div className="relative mt-8">
        <div className="absolute left-3.5 top-4 bottom-4 w-px bg-gradient-to-b from-emerald-500/60 via-primary/40 to-white/10" />
        <ul className="space-y-4">
          {stops.map((stop, index) => (
            <motion.li
              key={`${stop.city}-${index}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.06 }}
              className={cn(
                "relative flex items-center gap-4 pl-0",
                stop.status === "live" && "rounded-xl bg-red-500/5 px-3 py-2 -mx-3"
              )}
            >
              <StopBadge status={stop.status} />
              <div className="min-w-0 flex-1">
                <p className={cn("font-medium", stop.status === "live" && "text-red-300")}>
                  {stop.city}
                  {stop.state ? `, ${stop.state}` : ""}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 text-xs font-semibold uppercase tracking-wide",
                  stop.status === "completed" && "text-emerald-400",
                  stop.status === "live" && "text-red-400",
                  stop.status === "next" && "text-primary",
                  stop.status === "upcoming" && "text-muted-foreground"
                )}
              >
                {statusLabel(stop.status)}
              </span>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
