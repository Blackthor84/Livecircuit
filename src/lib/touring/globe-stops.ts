import type { GlobeTourStop } from "@/components/home/tour-globe-map";
import type { TourRouteStop } from "@/components/home/tour-route-map";
import type { ActiveTourCity } from "@/lib/touring/tour-context";

export type StopWithCityCoords = {
  tour_city?: string | null;
  virtual_location_label?: string | null;
  cities?: {
    name: string;
    latitude: number | null;
    longitude: number | null;
    countries?: { code: string; name: string } | { code: string; name: string }[] | null;
  } | null;
};

/** Build Mapbox globe stops from tour stops + route status. */
export function buildGlobeStopsFromTourStops(
  stops: StopWithCityCoords[],
  routeStops: TourRouteStop[]
): GlobeTourStop[] {
  const globeStops: GlobeTourStop[] = [];

  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    const route = routeStops[i];
    const city = stop?.cities;
    const lat = city?.latitude;
    const lng = city?.longitude;
    if (lat == null || lng == null) continue;

    const countryRaw = city?.countries;
    const countryRow = Array.isArray(countryRaw) ? countryRaw[0] : countryRaw;

    globeStops.push({
      city: route?.city ?? city?.name ?? stop.tour_city ?? stop.virtual_location_label ?? "Stop",
      lat,
      lng,
      status: route?.status ?? "upcoming",
      country: countryRow?.code ?? countryRow?.name,
    });
  }

  return globeStops;
}

/** Scatter plot of active tour cities (no connecting route). */
export function activeCitiesToGlobeStops(cities: ActiveTourCity[]): GlobeTourStop[] {
  return cities.map((city) => ({
    city: city.city,
    lat: city.lat,
    lng: city.lng,
    status: city.active ? ("live" as const) : ("upcoming" as const),
    country: city.country,
  }));
}
