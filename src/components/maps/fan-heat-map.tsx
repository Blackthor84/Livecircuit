"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { demoHeatPoints } from "@/lib/data/demo";
import type { HeatMapRegion, HeatPoint } from "@/lib/maps/heat-types";
import { MAP_VIEW } from "@/lib/maps/heat-types";
import { cn } from "@/lib/utils";

export type { HeatPoint } from "@/lib/maps/heat-types";

type Props = {
  points?: HeatPoint[];
  region?: HeatMapRegion;
  className?: string;
};

function featuresFromPoints(points: HeatPoint[]) {
  return points.map((p) => ({
    type: "Feature" as const,
    properties: {
      weight: p.weight,
      label: p.label,
      growth: p.growthPercent ?? 0,
    },
    geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
  }));
}

export function FanHeatMap({ points = demoHeatPoints, region = "us", className }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  const hasToken =
    Boolean(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) &&
    !process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!.includes("your-mapbox");

  useEffect(() => {
    if (!hasToken || !mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;
    const view = MAP_VIEW[region];
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: view.center,
      zoom: view.zoom,
    });
    mapRef.current = map;
    popupRef.current = new mapboxgl.Popup({ closeButton: false, offset: 12 });

    map.on("load", () => {
      map.addSource("fans", {
        type: "geojson",
        data: { type: "FeatureCollection", features: featuresFromPoints(points) },
      });

      map.addLayer({
        id: "fans-heat",
        type: "heatmap",
        source: "fans",
        maxzoom: 9,
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0, 1200, 1],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 3],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(88,28,135,0)",
            0.2,
            "#7c3aed",
            0.6,
            "#34d399",
            1,
            "#fbbf24",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 9, 28],
          "heatmap-opacity": 0.85,
        },
      });

      map.addLayer({
        id: "fans-points",
        type: "circle",
        source: "fans",
        minzoom: 4,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "weight"], 50, 4, 1200, 18],
          "circle-color": "#c084fc",
          "circle-opacity": 0.55,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#fafafa",
        },
      });

      map.on("click", "fans-points", (e) => {
        const f = e.features?.[0];
        if (!f || f.geometry.type !== "Point") return;
        const props = f.properties as { label: string; weight: number; growth: number };
        popupRef.current
          ?.setLngLat(f.geometry.coordinates as [number, number])
          .setHTML(
            `<strong>${props.label}</strong><br/>${Number(props.weight).toLocaleString()} fans<br/>30d growth: ${props.growth}%`
          )
          .addTo(map);
      });
      map.on("mouseenter", "fans-points", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "fans-points", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map init once
  }, [hasToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasToken) return;

    const apply = () => {
      const source = map.getSource("fans") as mapboxgl.GeoJSONSource | undefined;
      if (source) {
        source.setData({ type: "FeatureCollection", features: featuresFromPoints(points) });
      }
    };

    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [points, hasToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasToken) return;
    const view = MAP_VIEW[region];
    map.flyTo({ center: view.center, zoom: view.zoom, duration: 800 });
  }, [region, hasToken]);

  if (!hasToken) {
    return (
      <div className={cn("rounded-xl border border-white/10 bg-card/50 p-6", className)}>
        <p className="font-medium">Fan heat map preview</p>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {points.map((p) => (
            <li key={p.label} className="flex justify-between gap-4">
              <span>{p.label}</span>
              <span className="text-foreground">
                {p.weight.toLocaleString()} fans
                {p.growthPercent != null ? ` · +${p.growthPercent}%` : ""}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Set <code>NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> for the interactive US/world map.
        </p>
      </div>
    );
  }

  return (
    <div ref={mapContainer} className={cn("h-[420px] w-full overflow-hidden rounded-xl", className)} />
  );
}
