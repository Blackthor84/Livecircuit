"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { WORLD_CATEGORY_FILTERS, worldZoomLevelLabel } from "@/lib/constants/world";
import { filterMarkersByCategory, zoomLevelFromMapZoom } from "@/lib/services/world-zoom";
import type { WorldReport, WorldVenueMarker } from "@/lib/types/world";
import { MAP_VIEW } from "@/lib/maps/heat-types";
import { cn } from "@/lib/utils";
import { WorldSidePanel } from "@/components/world/world-side-panel";

function markerFeatures(markers: WorldVenueMarker[]) {
  return markers.map((m) => ({
    type: "Feature" as const,
    properties: {
      id: m.id,
      slug: m.slug,
      name: m.name,
      isLive: m.isLive ? 1 : 0,
      attendance: m.attendanceScore,
    },
    geometry: { type: "Point" as const, coordinates: [m.lng, m.lat] },
  }));
}

function festivalFeatures(report: WorldReport) {
  return report.festivals.map((f) => ({
    type: "Feature" as const,
    properties: { name: f.name, slug: f.slug, status: f.status },
    geometry: { type: "Point" as const, coordinates: [f.lng, f.lat] },
  }));
}

type Props = {
  report: WorldReport;
  className?: string;
};

export function LiveCircuitWorldExperience({ report, className }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef(report.markers);
  markersRef.current = report.markers;

  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [mapZoom, setMapZoom] = useState<number>(MAP_VIEW.world.zoom);
  const [selected, setSelected] = useState<WorldVenueMarker | null>(null);

  const filtered = useMemo(
    () => filterMarkersByCategory(report.markers, category, search),
    [report.markers, category, search]
  );

  const zoomLevel = zoomLevelFromMapZoom(mapZoom);

  const hasToken =
    Boolean(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) &&
    !process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!.includes("your-mapbox");

  const flyTo = useCallback((lng: number, lat: number, zoom: number) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 1400, essential: true });
  }, []);

  useEffect(() => {
    if (!hasToken || !mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: MAP_VIEW.world.center,
      zoom: MAP_VIEW.world.zoom,
      projection: "globe",
    });
    mapRef.current = map;

    map.on("zoom", () => setMapZoom(map.getZoom()));

    map.on("load", () => {
      map.setFog({
        color: "rgb(12, 10, 28)",
        "high-color": "rgb(36, 28, 72)",
        "horizon-blend": 0.08,
        "space-color": "rgb(8, 6, 18)",
        "star-intensity": 0.35,
      });

      map.addSource("venues", {
        type: "geojson",
        data: { type: "FeatureCollection", features: markerFeatures(filtered) },
        cluster: true,
        clusterMaxZoom: 8,
        clusterRadius: 42,
      });

      map.addSource("festivals", {
        type: "geojson",
        data: { type: "FeatureCollection", features: festivalFeatures(report) },
      });

      map.addLayer({
        id: "venues-clusters",
        type: "circle",
        source: "venues",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#7c3aed",
            8,
            "#34d399",
            20,
            "#fbbf24",
          ],
          "circle-radius": ["step", ["get", "point_count"], 16, 8, 22, 20, 28],
          "circle-opacity": 0.85,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#fafafa",
        },
      });

      map.addLayer({
        id: "venues-cluster-count",
        type: "symbol",
        source: "venues",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 12,
        },
        paint: { "text-color": "#ffffff" },
      });

      map.addLayer({
        id: "venues-unclustered",
        type: "circle",
        source: "venues",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 5, 10, 10, 14, 14],
          "circle-color": [
            "case",
            ["==", ["get", "isLive"], 1],
            "#fbbf24",
            "#a78bfa",
          ],
          "circle-opacity": 0.9,
          "circle-stroke-width": 2,
          "circle-stroke-color": [
            "case",
            ["==", ["get", "isLive"], 1],
            "#fef3c7",
            "#e9d5ff",
          ],
        },
      });

      map.addLayer({
        id: "festivals-pin",
        type: "circle",
        source: "festivals",
        paint: {
          "circle-radius": 9,
          "circle-color": "#22d3ee",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ecfeff",
        },
      });

      map.on("click", "venues-unclustered", (e) => {
        const f = e.features?.[0];
        if (!f || f.geometry.type !== "Point") return;
        const slug = f.properties?.slug as string;
        const marker = markersRef.current.find((m) => m.slug === slug) ?? null;
        setSelected(marker);
        map.flyTo({
          center: f.geometry.coordinates as [number, number],
          zoom: Math.max(map.getZoom(), 11),
          duration: 900,
        });
      });

      map.on("click", "venues-clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["venues-clusters"] });
        const cluster = features[0];
        if (!cluster) return;
        const source = map.getSource("venues") as mapboxgl.GeoJSONSource;
        const clusterId = cluster.properties?.cluster_id as number;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || zoom == null) return;
          const geom = cluster.geometry;
          if (geom.type !== "Point") return;
          map.easeTo({ center: geom.coordinates as [number, number], zoom });
        });
      });

      map.on("mouseenter", "venues-unclustered", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "venues-unclustered", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, [hasToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasToken) return;
    const apply = () => {
      const source = map.getSource("venues") as mapboxgl.GeoJSONSource | undefined;
      source?.setData({ type: "FeatureCollection", features: markerFeatures(filtered) });
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [filtered, hasToken]);

  if (!hasToken) {
    return (
      <div className={cn("grid gap-6 lg:grid-cols-[360px_1fr]", className)}>
        <WorldSidePanel
          report={report}
          category={category}
          onCategoryChange={setCategory}
          search={search}
          onSearchChange={setSearch}
          zoomLevel={zoomLevel}
          zoomLabel={worldZoomLevelLabel(zoomLevel)}
          selected={selected}
          onFlyTo={flyTo}
          onSelect={setSelected}
        />
        <div className="glass-panel rounded-xl p-6">
          <p className="font-medium">LiveCircuit World preview</p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {filtered.map((m) => (
              <li key={m.id} className="flex justify-between gap-2">
                <span>{m.name}</span>
                <span>{m.isLive ? "Live" : "Idle"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Set <code>NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> for the interactive globe.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-6 lg:grid-cols-[360px_1fr]", className)}>
      <WorldSidePanel
        report={report}
        category={category}
        onCategoryChange={setCategory}
        search={search}
        onSearchChange={setSearch}
        zoomLevel={zoomLevel}
        zoomLabel={worldZoomLevelLabel(zoomLevel)}
        selected={selected}
        onFlyTo={flyTo}
        onSelect={setSelected}
      />
      <div className="relative min-h-[520px] overflow-hidden rounded-xl border border-white/10">
        <div ref={mapContainer} className="absolute inset-0" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background/80 to-transparent" />
        <div className="absolute bottom-3 left-3 rounded-lg bg-background/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
          Zoom: {worldZoomLevelLabel(zoomLevel)} · {filtered.length} venues
        </div>
      </div>
    </div>
  );
}
