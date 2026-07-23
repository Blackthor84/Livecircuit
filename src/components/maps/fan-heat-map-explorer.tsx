"use client";

import { useCallback, useEffect, useState } from "react";
import { FanHeatMap } from "@/components/maps/fan-heat-map";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FanHeatResult, HeatGrowthWindow, HeatMapRegion } from "@/lib/maps/heat-types";

type Props = {
  artistId: string;
  initial: FanHeatResult;
};

export function FanHeatMapExplorer({ artistId, initial }: Props) {
  const [region, setRegion] = useState<HeatMapRegion>("us");
  const [window, setWindow] = useState<HeatGrowthWindow>("all");
  const [minGrowth, setMinGrowth] = useState(0);
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        region,
        window,
        minGrowth: String(minGrowth),
      });
      const res = await fetch(`/api/artists/${artistId}/fan-heat?${params.toString()}`);
      if (res.ok) {
        const json = (await res.json()) as FanHeatResult;
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, [artistId, region, window, minGrowth]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={region === "us" ? "default" : "outline"}
            onClick={() => setRegion("us")}
          >
            United States
          </Button>
          <Button
            type="button"
            size="sm"
            variant={region === "world" ? "default" : "outline"}
            onClick={() => setRegion("world")}
          >
            World
          </Button>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Audience window</Label>
          <Select value={window} onValueChange={(v) => setWindow((v ?? "all") as HeatGrowthWindow)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All followers</SelectItem>
              <SelectItem value="30d">New last 30 days</SelectItem>
              <SelectItem value="90d">New last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Min 30d growth %</Label>
          <Select
            value={String(minGrowth)}
            onValueChange={(v) => setMinGrowth(Number(v ?? 0))}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Any growth</SelectItem>
              <SelectItem value="10">10%+</SelectItem>
              <SelectItem value="25">25%+</SelectItem>
              <SelectItem value="50">50%+</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground sm:ml-auto">
          {loading ? "Updating…" : `${data.totals.filteredFans.toLocaleString()} fans on map`}
        </p>
      </div>
      {data.points.length > 0 ? (
        <FanHeatMap points={data.points} region={region} />
      ) : (
        <p className="text-sm text-muted-foreground">
          No locations match these filters. Try a wider growth window or lower growth threshold.
        </p>
      )}
    </div>
  );
}

export function FanHeatTopLocations({
  locations,
}: {
  locations: FanHeatResult["topLocations"];
}) {
  if (!locations.length) {
    return <p className="text-sm text-muted-foreground">No fan location data yet.</p>;
  }
  return (
    <ul className="space-y-2 text-sm">
      {locations.map((loc) => (
        <li key={loc.label} className="flex justify-between gap-2">
          <span>{loc.label}</span>
          <span className="text-right font-medium tabular-nums">
            {loc.count.toLocaleString()}
            {loc.growthPercent != null ? (
              <span className="ml-2 text-xs text-muted-foreground">+{loc.growthPercent}%</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
