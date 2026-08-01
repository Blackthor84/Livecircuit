"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { HeatPoint } from "@/lib/maps/heat-types";
import { MAP_VIEW } from "@/lib/maps/heat-types";
import { buildRouteSegments } from "@/lib/touring/globe-route-utils";
import { cn } from "@/lib/utils";

export type GlobeTourStop = {
  city: string;
  lat: number;
  lng: number;
  status: "completed" | "live" | "next" | "upcoming";
  country?: string;
};

type Props = {
  stops: GlobeTourStop[];
  heatPoints?: HeatPoint[];
  className?: string;
  autoRotate?: boolean;
  showRoute?: boolean;
  animateRoute?: boolean;
  showHeat?: boolean;
  variant?: "hero" | "compact";
};

function stopColor(status: GlobeTourStop["status"]) {
  switch (status) {
    case "completed":
      return "#34d399";
    case "live":
      return "#f87171";
    case "next":
      return "#a78bfa";
    default:
      return "#94a3b8";
  }
}

function heatFeatures(points: HeatPoint[]) {
  return points.map((p) => ({
    type: "Feature" as const,
    properties: { weight: p.weight, label: p.label },
    geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
  }));
}

function lineFeature(coords: [number, number][]) {
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "LineString" as const, coordinates: coords },
  };
}

/** Mapbox 3D globe — signature LiveCircuit digital touring map. */
export function TourGlobeMap({
  stops,
  heatPoints = [],
  className,
  autoRotate = true,
  showRoute = true,
  animateRoute = true,
  showHeat = true,
  variant = "compact",
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const animRef = useRef(0);
  const pulseRef = useRef(0);

  const hasToken =
    Boolean(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) &&
    !process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!.includes("your-mapbox");

  useEffect(() => {
    if (!hasToken || !mapContainer.current || stops.length === 0) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: MAP_VIEW.world.center,
      zoom: variant === "hero" ? 1.2 : MAP_VIEW.world.zoom,
      projection: "globe",
      antialias: true,
    });
    mapRef.current = map;

    map.on("style.load", () => {
      map.setFog({
        color: "rgb(12, 12, 32)",
        "high-color": "rgb(40, 32, 80)",
        "horizon-blend": 0.12,
        "space-color": "rgb(6, 6, 16)",
        "star-intensity": 0.45,
      });

      const pointFeatures = stops.map((s) => ({
        type: "Feature" as const,
        properties: { city: s.city, status: s.status, color: stopColor(s.status) },
        geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
      }));

      map.addSource("tour-stops", {
        type: "geojson",
        data: { type: "FeatureCollection", features: pointFeatures },
      });

      if (showHeat && heatPoints.length > 0) {
        map.addSource("fan-heat", {
          type: "geojson",
          data: { type: "FeatureCollection", features: heatFeatures(heatPoints) },
        });
        map.addLayer({
          id: "fan-heat-layer",
          type: "heatmap",
          source: "fan-heat",
          maxzoom: 6,
          paint: {
            "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0, 1200, 1],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.6, 4, 1.2],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(88,28,135,0)",
              0.25,
              "rgba(124,58,237,0.35)",
              0.55,
              "rgba(52,211,153,0.45)",
              0.85,
              "rgba(251,191,36,0.55)",
            ],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 18, 4, 36],
            "heatmap-opacity": 0.55,
          },
        });
      }

      if (showRoute && stops.length > 1) {
        const segments = buildRouteSegments(stops);

        if (segments.completed.length > 1) {
          map.addSource("route-completed", {
            type: "geojson",
            data: lineFeature(segments.completed),
          });
          map.addLayer({
            id: "route-completed-line",
            type: "line",
            source: "route-completed",
            paint: {
              "line-color": "#34d399",
              "line-width": 2,
              "line-opacity": 0.85,
            },
          });
        }

        if (segments.active.length > 1) {
          map.addSource("route-active", {
            type: "geojson",
            data: lineFeature(segments.active),
          });
          map.addLayer({
            id: "route-active-line",
            type: "line",
            source: "route-active",
            paint: {
              "line-color": "#f87171",
              "line-width": 3,
              "line-opacity": 0.95,
              "line-dasharray": animateRoute ? [2, 2] : [1, 0],
            },
          });
        }

        if (segments.upcoming.length > 1) {
          map.addSource("route-upcoming", {
            type: "geojson",
            data: lineFeature(segments.upcoming),
          });
          map.addLayer({
            id: "route-upcoming-line",
            type: "line",
            source: "route-upcoming",
            paint: {
              "line-color": "#8b5cf6",
              "line-width": 2,
              "line-opacity": 0.45,
              "line-dasharray": [1, 2],
            },
          });
        }
      }

      map.addLayer({
        id: "tour-stop-beam",
        type: "circle",
        source: "tour-stops",
        filter: ["==", ["get", "status"], "live"],
        paint: {
          "circle-radius": 22,
          "circle-color": "#f87171",
          "circle-opacity": 0.12,
          "circle-blur": 1,
        },
      });

      map.addLayer({
        id: "tour-stop-glow",
        type: "circle",
        source: "tour-stops",
        paint: {
          "circle-radius": ["match", ["get", "status"], "live", 16, "next", 12, 8],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.3,
          "circle-blur": 0.7,
        },
      });

      map.addLayer({
        id: "tour-stop-points",
        type: "circle",
        source: "tour-stops",
        paint: {
          "circle-radius": ["match", ["get", "status"], "live", 8, "next", 6, 5],
          "circle-color": ["get", "color"],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.addLayer({
        id: "tour-stop-labels",
        type: "symbol",
        source: "tour-stops",
        layout: {
          "text-field": ["get", "city"],
          "text-size": variant === "hero" ? 12 : 11,
          "text-offset": [0, 1.5],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#f1f5f9",
          "text-halo-color": "#0f172a",
          "text-halo-width": 1.5,
        },
      });

      if (stops.length > 0 && variant !== "hero") {
        const routeCoords = stops.map((s) => [s.lng, s.lat] as [number, number]);
        const bounds = routeCoords.reduce(
          (b, coord) => b.extend(coord as mapboxgl.LngLatLike),
          new mapboxgl.LngLatBounds(routeCoords[0], routeCoords[0])
        );
        map.fitBounds(bounds, { padding: 80, maxZoom: 3.5, duration: 1200 });
      }
    });

    let frame = 0;
    const tick = () => {
      if (!mapRef.current || !map.isStyleLoaded()) {
        animRef.current = requestAnimationFrame(tick);
        return;
      }

      frame += 0.04;

      const sunAngle = (Date.now() / 60000) % 360;
      map.setLight({
        anchor: "viewport",
        color: "#fff8f0",
        intensity: 0.35 + Math.sin(frame * 0.02) * 0.05,
        position: [1.5, sunAngle, 80],
      });

      if (autoRotate) {
        map.setCenter([MAP_VIEW.world.center[0] + frame * 0.15, MAP_VIEW.world.center[1]]);
      }

      if (animateRoute && map.getLayer("route-active-line")) {
        map.setPaintProperty("route-active-line", "line-dasharray", [2, 2]);
        map.setPaintProperty("route-active-line", "line-opacity", 0.6 + Math.sin(frame * 0.08) * 0.35);
      }

      const pulse = 14 + Math.sin(frame * 0.12) * 4;
      if (map.getLayer("tour-stop-glow")) {
        map.setPaintProperty("tour-stop-glow", "circle-radius", [
          "match",
          ["get", "status"],
          "live",
          pulse,
          "next",
          pulse * 0.75,
          8,
        ]);
      }
      if (map.getLayer("tour-stop-beam")) {
        map.setPaintProperty("tour-stop-beam", "circle-radius", 20 + Math.sin(frame * 0.1) * 6);
        map.setPaintProperty("tour-stop-beam", "circle-opacity", 0.08 + Math.sin(frame * 0.1) * 0.06);
      }

      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);

    if (variant === "hero" && autoRotate) {
      let zoomPhase = 0;
      const zoomCycle = () => {
        if (!mapRef.current) return;
        zoomPhase += 0.002;
        const z = 1.15 + Math.sin(zoomPhase) * 0.25;
        map.easeTo({ zoom: z, duration: 0, essential: true });
        pulseRef.current = requestAnimationFrame(zoomCycle);
      };
      pulseRef.current = requestAnimationFrame(zoomCycle);
    }

    return () => {
      cancelAnimationFrame(animRef.current);
      cancelAnimationFrame(pulseRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, [hasToken, stops, heatPoints, autoRotate, showRoute, animateRoute, showHeat, variant]);

  if (!hasToken) {
    return (
      <div
        className={cn(
          "flex aspect-[16/10] items-center justify-center rounded-3xl border border-white/10 bg-black/40 text-sm text-muted-foreground",
          className
        )}
      >
        Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to enable the 3D tour globe.
      </div>
    );
  }

  if (stops.length === 0) {
    return (
      <div
        className={cn(
          "flex aspect-[16/10] items-center justify-center rounded-3xl border border-white/10 bg-black/40 text-sm text-muted-foreground",
          className
        )}
      >
        Tour routes will appear on the globe when stops are scheduled.
      </div>
    );
  }

  return (
    <div
      ref={mapContainer}
      className={cn(
        "w-full overflow-hidden",
        variant === "hero" ? "h-full min-h-[420px]" : "aspect-[16/10] rounded-3xl border border-white/10",
        className
      )}
    />
  );
}

/** Animated counter for live platform statistics. */
export function AnimatedStatCounter({ value, label }: { value: number; label: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(display, value, {
      duration: 1.4,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="text-center">
      <span className="block text-2xl font-bold tabular-nums sm:text-3xl">{display.toLocaleString()}</span>
      <span className="mt-1 block text-xs text-muted-foreground sm:text-sm">{label}</span>
    </div>
  );
}
