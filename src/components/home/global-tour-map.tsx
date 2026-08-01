"use client";

import { motion } from "framer-motion";
import { GLOBAL_TOUR_CITIES } from "@/lib/home/digital-touring-content";
import type { ActiveTourCity } from "@/lib/touring/tour-context";

type MapCity = {
  city: string;
  country: string;
  lat: number;
  lng: number;
  active: boolean;
};

/** Decorative world map showing active digital tours across cities. */
export function GlobalTourMap({ cities }: { cities?: ActiveTourCity[] }) {
  const points: MapCity[] =
    cities && cities.length > 0
      ? cities
      : GLOBAL_TOUR_CITIES.map((c) => ({ ...c, active: c.active ?? false }));

  return (
    <div className="relative mx-auto aspect-[16/10] w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_50%_50%,oklch(0.72_0.19_300/0.15)_0%,transparent_55%),repeating-linear-gradient(0deg,transparent,transparent_24px,rgba(255,255,255,0.03)_24px,rgba(255,255,255,0.03)_25px),repeating-linear-gradient(90deg,transparent,transparent_24px,rgba(255,255,255,0.03)_24px,rgba(255,255,255,0.03)_25px)]" />

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
                <span className="absolute -inset-2 animate-ping rounded-full bg-primary/30" />
              ) : null}
              <span
                className={`relative block size-3 rounded-full ${
                  point.active ? "bg-primary shadow-[0_0_12px_oklch(0.72_0.19_300)]" : "bg-white/30"
                }`}
              />
              <span className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-foreground/80">
                {point.city}
              </span>
            </div>
          </motion.div>
        );
      })}

      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-4 text-xs text-muted-foreground sm:bottom-6 sm:left-6">
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary" /> Active tour stop
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-white/30" /> Upcoming stop
        </span>
      </div>
    </div>
  );
}
