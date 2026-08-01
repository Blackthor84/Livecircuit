import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TourRouteStop } from "@/components/home/tour-route-map";
import { formatTimeUntil } from "@/lib/touring/tour-route-status";

type Props = {
  stops: TourRouteStop[];
  nextStopAt?: string | null;
  className?: string;
};

export function TourTimeline({ stops, nextStopAt, className }: Props) {
  const nextIn = nextStopAt ? formatTimeUntil(nextStopAt) : null;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium">Tour timeline</p>
        {nextIn ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            Next stop in {nextIn}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {stops.map((stop, index) => (
          <span
            key={`${stop.city}-${index}`}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              stop.status === "completed" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
              stop.status === "live" && "border-red-500/40 bg-red-500/10 text-red-300",
              stop.status === "next" && "border-primary/40 bg-primary/10 text-primary",
              stop.status === "upcoming" && "border-white/10 bg-white/5 text-muted-foreground"
            )}
          >
            {stop.city}
            {stop.status === "live" ? " ● LIVE" : stop.status === "next" ? " → Next" : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
