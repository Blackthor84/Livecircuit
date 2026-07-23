"use client";

import Link from "next/link";
import { Clock, CloudSun, Flame, MapPin, Radio, Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WORLD_CATEGORY_FILTERS, type WorldZoomLevel } from "@/lib/constants/world";
import type { WorldReport, WorldVenueMarker } from "@/lib/types/world";
import { cn } from "@/lib/utils";

const ZOOM_TRAIL: WorldZoomLevel[] = ["earth", "country", "state", "city", "venue", "concourse", "event"];

type Props = {
  report: WorldReport;
  category: string;
  onCategoryChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  zoomLevel: WorldZoomLevel;
  zoomLabel: string;
  selected: WorldVenueMarker | null;
  onFlyTo: (lng: number, lat: number, zoom: number) => void;
  onSelect: (marker: WorldVenueMarker | null) => void;
};

export function WorldSidePanel({
  report,
  category,
  onCategoryChange,
  search,
  onSearchChange,
  zoomLevel,
  zoomLabel,
  selected,
  onFlyTo,
  onSelect,
}: Props) {
  const trailIndex = ZOOM_TRAIL.indexOf(zoomLevel);

  return (
    <aside className="glass-panel flex max-h-[720px] flex-col gap-5 overflow-y-auto rounded-xl p-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Sparkles className="h-5 w-5 text-primary" />
          LiveCircuit World
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Fly the globe · zoom into venues · join live shows.</p>
      </div>

      <nav aria-label="Zoom path" className="flex flex-wrap gap-1 text-xs">
        {ZOOM_TRAIL.map((level, i) => (
          <span key={level} className="flex items-center gap-1">
            {i > 0 ? <span className="text-muted-foreground">→</span> : null}
            <span className={cn("rounded-full px-2 py-0.5", i === trailIndex ? "bg-primary/20 text-primary" : "text-muted-foreground")}>
              {level === zoomLevel ? zoomLabel : level.charAt(0).toUpperCase() + level.slice(1)}
            </span>
          </span>
        ))}
      </nav>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search venues or cities"
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {WORLD_CATEGORY_FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={category === f.value ? "default" : "outline"}
            onClick={() => onCategoryChange(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg border border-white/10 p-3">
          <p className="text-muted-foreground">Live venues</p>
          <p className="text-lg font-semibold tabular-nums">{report.totals.liveVenues}</p>
        </div>
        <div className="rounded-lg border border-white/10 p-3">
          <p className="text-muted-foreground">On now</p>
          <p className="text-lg font-semibold tabular-nums">{report.totals.liveEvents}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{report.totals.densityLabel}</p>

      <section>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Flame className="h-4 w-4 text-amber-400" />
          Trending regions
        </h2>
        <ul className="mt-2 space-y-1">
          {report.trending.map((r) => (
            <li key={r.regionKey}>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/5"
                onClick={() => onFlyTo(r.lng, r.lat, 5.5)}
              >
                <span>{r.label}</span>
                <span className="text-xs text-muted-foreground">{r.liveEventCount} live</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {report.festivals.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold">Featured festivals</h2>
          <ul className="mt-2 space-y-2">
            {report.festivals.map((f) => (
              <li key={f.slug}>
                <Link
                  href={f.href}
                  className="block rounded-lg border border-white/10 p-3 text-sm hover:border-primary/40"
                  onMouseEnter={() => onFlyTo(f.lng, f.lat, 4)}
                >
                  <span className="font-medium">{f.name}</span>
                  {f.tagline ? <p className="text-xs text-muted-foreground">{f.tagline}</p> : null}
                  <Badge variant="secondary" className="mt-2 capitalize">
                    {f.status}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {selected ? (
        <section className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-semibold">{selected.name}</h2>
              <p className="text-xs text-muted-foreground">
                {[selected.cityName, selected.stateCode, selected.countryName].filter(Boolean).join(" · ")}
              </p>
            </div>
            {selected.isLive ? (
              <Badge className="gap-1">
                <Radio className="h-3 w-3" />
                Live
              </Badge>
            ) : null}
          </div>
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              Local time {selected.localTimeLabel}
            </li>
            <li className="flex items-center gap-2">
              <CloudSun className="h-3.5 w-3.5" />
              {selected.weatherSummary}
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              {selected.currentVisitors.toLocaleString()} on concourse · {selected.liveEventCount} live event
              {selected.liveEventCount === 1 ? "" : "s"}
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" href={selected.venueHref}>
              Venue
            </Button>
            <Button size="sm" variant="secondary" href={selected.concourseHref}>
              Concourse
            </Button>
            {selected.isLive && selected.featuredLiveArtistSlug && selected.featuredLiveEventSlug ? (
              <Button
                size="sm"
                variant="outline"
                href={`/artists/${selected.featuredLiveArtistSlug}/events/${selected.featuredLiveEventSlug}`}
              >
                Live event
              </Button>
            ) : null}
          </div>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => onSelect(null)}>
            Clear selection
          </Button>
        </section>
      ) : null}
    </aside>
  );
}
