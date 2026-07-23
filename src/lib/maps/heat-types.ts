export type HeatMapRegion = "us" | "world";
export type HeatGrowthWindow = "all" | "30d" | "90d";

export type HeatPoint = {
  lng: number;
  lat: number;
  weight: number;
  label: string;
  growthPercent?: number;
};

export type FanHeatResult = {
  points: HeatPoint[];
  topLocations: { label: string; count: number; growthPercent?: number }[];
  totals: { fans: number; filteredFans: number };
};

/** ISO country centroids for fans with country only (world view). */
export const COUNTRY_CENTROIDS: Record<string, { lat: number; lng: number; name: string }> = {
  US: { lat: 39.8283, lng: -98.5795, name: "United States" },
  CA: { lat: 56.1304, lng: -106.3468, name: "Canada" },
  GB: { lat: 55.3781, lng: -3.436, name: "United Kingdom" },
  DE: { lat: 51.1657, lng: 10.4515, name: "Germany" },
  FR: { lat: 46.2276, lng: 2.2137, name: "France" },
  BR: { lat: -14.235, lng: -51.9253, name: "Brazil" },
  AU: { lat: -25.2744, lng: 133.7751, name: "Australia" },
  JP: { lat: 36.2048, lng: 138.2529, name: "Japan" },
  MX: { lat: 23.6345, lng: -102.5528, name: "Mexico" },
  IN: { lat: 20.5937, lng: 78.9629, name: "India" },
};

export const MAP_VIEW = {
  us: { center: [-98.5795, 39.8283] as [number, number], zoom: 3.4 },
  world: { center: [10, 24] as [number, number], zoom: 1.35 },
} as const;
