"use client";

import { ArrowRight, Globe2, Radio } from "lucide-react";
import { GlobalTourMap } from "@/components/home/global-tour-map";
import { TourActivityTicker } from "@/components/home/tour-activity-ticker";
import { AnimatedStatCounter } from "@/components/home/tour-globe-map";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { DIGITAL_TOURING_BRAND } from "@/lib/home/digital-touring-content";
import type { HomepageTouringPayload } from "@/lib/touring/homepage-data";

type Props = Pick<
  HomepageTouringPayload,
  "stats" | "activityFeed" | "heatPoints" | "heroGlobeStops" | "showHeroRoute"
>;

/** Full-viewport digital touring hero — globe-first, not a streaming platform. */
export function DigitalTouringHero({
  stats,
  activityFeed,
  heatPoints,
  heroGlobeStops,
  showHeroRoute,
}: Props) {
  const statItems = [
    { value: stats.artistsTouring, label: "Artists Touring" },
    { value: stats.livePerformances, label: "Live Performances" },
    { value: stats.countriesWatching, label: "Countries Watching" },
    { value: stats.activeArenas, label: "Active Arenas" },
    { value: stats.fansWatching, label: "Fans Watching" },
    { value: stats.toursStartingToday, label: "Tours Starting Today" },
  ];

  return (
    <section className="relative min-h-[88vh] overflow-hidden">
      <TourActivityTicker items={activityFeed} />

      <div className="absolute inset-0 top-10">
        <GlobalTourMap
          globeStops={heroGlobeStops}
          showRoute={showHeroRoute}
          heatPoints={heatPoints}
          variant="hero"
          className="h-full rounded-none border-0"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/80 via-background/20 to-background" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/60" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[80vh] max-w-7xl flex-col justify-center px-4 py-16 sm:px-6">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-primary">
            <Globe2 className="size-4" />
            {DIGITAL_TOURING_BRAND.platformName}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="text-gradient">{DIGITAL_TOURING_BRAND.heroHeadline}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">{DIGITAL_TOURING_BRAND.heroSubheadline}</p>
          <p className="mt-3 text-sm font-medium text-primary/90">{DIGITAL_TOURING_BRAND.fanMantra}</p>
          <p className="mt-1 text-xs text-muted-foreground/80">{DIGITAL_TOURING_BRAND.streamingNote}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" href={ROUTES.tours}>
              <Radio className="size-4" />
              {DIGITAL_TOURING_BRAND.secondaryCta}
            </Button>
            <Button size="lg" variant="secondary" href={`${ROUTES.register}?role=artist`}>
              {DIGITAL_TOURING_BRAND.primaryCta}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-6 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md sm:grid-cols-3 lg:grid-cols-6">
          {statItems.map((item) => (
            <AnimatedStatCounter key={item.label} value={item.value} label={item.label} />
          ))}
        </div>
      </div>
    </section>
  );
}
