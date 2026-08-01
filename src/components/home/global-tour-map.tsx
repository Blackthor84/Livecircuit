"use client";

import { motion } from "framer-motion";
import type { GlobeTourStop } from "@/components/home/tour-globe-map";
import { TourGlobeMap } from "@/components/home/tour-globe-map";
import { GLOBAL_TOUR_CITIES, DEMO_TOUR_ROUTE } from "@/lib/home/digital-touring-content";
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

function demoStops(): GlobeTourStop[] {
  return DEMO_TOUR_ROUTE.stops.map((s) => ({
    city: s.city,
    lat: GLOBAL_TOUR_CITIES.find((c) => c.city === s.city)?.lat ?? 40,
    lng: GLOBAL_TOUR_CITIES.find((c) => c.city === s.city)?.lng ?? -74,
    status: s.status,
    country: "USA",
  }));
}

/** 3D globe when Mapbox is configured; animated CSS fallback otherwise. */
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
        : demoStops();

  if (hasToken && stops.length > 0) {
    return (
      <TourGlobeMap
        stops={stops}
        heatPoints={heatPoints}
        showRoute={showRoute}
        animateRoute
        showHeat={heatPoints.length > 0}
        autoRotate
        variant={variant}
        className={className}
      />
    );
  }

  const points =
    cities && cities.length > 0
      ? cities
      : GLOBAL_TOUR_CITIES.map((c) => ({ ...c, active: c.active ?? false }));

  return (
    <div
      className={`relative mx-auto w-full overflow-hidden ${
        variant === "hero" ? "h-full min-h-[420px]" : "aspect-[16/10] max-w-4xl rounded-3xl border border-white/10"
      } bg-gradient-to-br from-primary/10 via-background to-accent/10 ${className ?? ""}`}
    >
      <div className="absolute inset-0 animate-pulse-slow opacity-30 [background-image:radial-gradient(circle_at_30%_40%,oklch(0.72_0.19_300/0.2)_0%,transparent_50%),radial-gradient(circle_at_70%_60%,oklch(0.65_0.15_200/0.15)_0%,transparent_45%)]" />
      <div className="absolute inset-0 opacity-40 [background-image:repeating-linear-gradient(0deg,transparent,transparent_24px,rgba(255,255,255,0.03)_24px,rgba(255,255,255,0.03)_25px),repeating-linear-gradient(90deg,transparent,transparent_24px,rgba(255,255,255,0.03)_24px,rgba(255,255,255,0.03)_25px)]" />

      {points.map((point, i) => {
        const x = ((point.lng + 180) / 360) * 100;
        const y = ((90 - point.lat) / 180) * 100;
        return (
          <motion.div
            key={point.city}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
          >
            <div className="relative">
              {point.active ? (
                <>
                  <span className="absolute -inset-3 animate-ping rounded-full bg-primary/25" />
                  <span className="absolute -inset-1 animate-pulse rounded-full bg-primary/40" />
                </>
              ) : null}
              <span
                className={`relative block size-3 rounded-full ${
                  point.active ? "bg-primary shadow-[0_0_16px_oklch(0.72_0.19_300)]" : "bg-white/30"
                }`}
              />
              <span className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-foreground/80">
                {point.city}
              </span>
            </div>
          </motion.div>
        );
      })}

      {showRoute && stops.length > 1 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
          <div className="h-px w-2/3 animate-pulse bg-gradient-to-r from-emerald-400 via-red-400 to-violet-500" />
        </div>
      ) : null}

      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-4 text-xs text-muted-foreground sm:bottom-6 sm:left-6">
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary animate-pulse" /> Live tour stop
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-white/30" /> Upcoming stop
        </span>
      </div>
    </div>
  );
}
