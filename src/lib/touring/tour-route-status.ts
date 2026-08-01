import type { TourRouteStop } from "@/components/home/tour-route-map";

type RoutableStop = {
  scheduled_at: string;
  tour_city?: string | null;
  virtual_location_label?: string | null;
  cities?: { name: string } | null;
  tour_state_code?: string | null;
};

function stopCityLabel(stop: RoutableStop): string {
  return stop.cities?.name ?? stop.tour_city ?? stop.virtual_location_label ?? "Tour stop";
}

/** Derive completed / live / next / upcoming status for a tour's stop list. */
export function mapStopsToRouteStatus(stops: RoutableStop[], now = Date.now()): TourRouteStop[] {
  if (!stops.length) return [];

  const upcomingIndex = stops.findIndex((s) => new Date(s.scheduled_at).getTime() > now);

  if (upcomingIndex === -1) {
    return stops.map((stop) => ({
      city: stopCityLabel(stop),
      state: stop.tour_state_code ?? undefined,
      status: "completed" as const,
    }));
  }

  if (upcomingIndex === 0) {
    return stops.map((stop, index) => ({
      city: stopCityLabel(stop),
      state: stop.tour_state_code ?? undefined,
      status: index === 0 ? ("next" as const) : ("upcoming" as const),
    }));
  }

  const liveIndex = upcomingIndex - 1;
  return stops.map((stop, index) => {
    const city = stopCityLabel(stop);
    const state = stop.tour_state_code ?? undefined;
    let status: TourRouteStop["status"];
    if (index < liveIndex) status = "completed";
    else if (index === liveIndex) status = "live";
    else if (index === upcomingIndex) status = "next";
    else status = "upcoming";
    return { city, state, status };
  });
}

export function countRemainingStops(routeStops: TourRouteStop[]): number {
  return routeStops.filter((s) => s.status === "upcoming" || s.status === "next").length;
}

export function getNextStop(routeStops: TourRouteStop[]): TourRouteStop | null {
  return routeStops.find((s) => s.status === "next") ?? null;
}

export function getLiveStop(routeStops: TourRouteStop[]): TourRouteStop | null {
  return routeStops.find((s) => s.status === "live") ?? null;
}

export function formatTimeUntil(isoDate: string, now = Date.now()): string | null {
  const diffMs = new Date(isoDate).getTime() - now;
  if (diffMs <= 0) return null;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
