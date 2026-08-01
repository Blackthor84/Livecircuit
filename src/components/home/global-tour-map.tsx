"use client";

import { motion } from "framer-motion";
import type { GlobeTourStop } from "@/components/home/tour-globe-map";
import { TourGlobeMap } from "@/components/home/tour-globe-map";
import type { HeatPoint } from "@/lib/maps/heat-types";
import type { ActiveTourCity } from "@/lib/touring/tour-context";
import { activeCitiesToGlobeStops } from "@/lib/touring/globe-stops";

type Props = {
  cities?: ActiveTourCity[];
  globeStops?: GlobeTourStop[];
  heatPoints?: HeatPoint[];
  showRoute?: boolean;
  variant?: "hero" | "compact";
  className?: string;
};

/** 3D globe when Mapbox is configured; honest empty fallback otherwise. */
export function GlobalTourMap({
  cities,
  globeStops,
  heatPoints = [],
  showRoute = false,
  variant = "compact",
  className,
}: Props) {
  const hasToken =
    Boolean(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) &&
    !process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!.includes("your-mapbox");

  const stops: GlobeTourStop[] =
    globeStops && globeStops.length > 0
      ? globeStops
      : cities && cities.length > 0
        ? activeCitiesToGlobeStops(cities)
        : [];

  if (hasToken) {
    return (
      <TourGlobeMap
        stops={stops}
        heatPoints={heatPoints}
        showRoute={showRoute && stops.length > 1}
        animateRoute={stops.length > 0}
        showHeat={heatPoints.length > 0}
        autoRotate
        variant={variant}
        className={className}
      />
    );
  }

  return (
    <div
      className={`relative mx-auto w-full overflow-hidden ${
        variant === "hero" ? "h-full min-h-[420px]" : "aspect-[16/10] max-w-4xl rounded-3xl border border-white/10"
      } bg-gradient-to-br from-primary/10 via-background to-accent/10 ${className ?? ""}`}
    >
      <div className="absolute inset-0 animate-pulse-slow opacity-30 [background-image:radial-gradient(circle_at_30%_40%,oklch(0.72_0.19_300/0.2)_0%,transparent_50%),radial-gradient(circle_at_70%_60%,oklch(0.65_0.15_200/0.15)_0%,transparent_45%)]" />

      {stops.map((point, i) => {
        const x = ((point.lng + 180) / 360) * 100;
        const y = ((90 - point.lat) / 180) * 100;
        return (
          <motion.div
            key={`${point.city}-${i}`}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
          >
            <div className="relative">
              {point.status === "live" ? (
                <>
                  <span className="absolute -inset-3 animate-ping rounded-full bg-primary/25" />
                  <span className="absolute -inset-1 animate-pulse rounded-full bg-primary/40" />
                </>
              ) : null}
              <span
                className={`relative block size-3 rounded-full ${
                  point.status === "live"
                    ? "bg-primary shadow-[0_0_16px_oklch(0.72_0.19_300)]"
                    : "bg-white/30"
                }`}
              />
            </div>
          </motion.div>
        );
      })}

      {stops.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
          <p className="max-w-sm text-sm text-muted-foreground">
            The interactive tour globe will display real routes when artists launch digital tours.
          </p>
        </div>
      ) : null}
    </div>
  );
}
