import { WORLD_ZOOM_LEVELS, type WorldZoomLevel } from "@/lib/constants/world";

export function zoomLevelFromMapZoom(zoom: number): WorldZoomLevel {
  for (const row of WORLD_ZOOM_LEVELS) {
    if (zoom >= row.minZoom && zoom < row.maxZoom) return row.level;
  }
  return zoom >= WORLD_ZOOM_LEVELS[WORLD_ZOOM_LEVELS.length - 1].minZoom
    ? WORLD_ZOOM_LEVELS[WORLD_ZOOM_LEVELS.length - 1].level
    : "earth";
}

/** Rough local time label from longitude (15° ≈ one hour). */
export function approximateLocalTime(longitude: number, now = new Date()): string {
  const offsetHours = Math.round(longitude / 15);
  const ms = now.getTime() + offsetHours * 60 * 60 * 1000;
  return new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function filterMarkersByCategory<T extends { isLive: boolean; categories: string[]; isFestivalHub?: boolean }>(
  markers: T[],
  filter: string,
  search: string
): T[] {
  let list = markers;
  if (filter === "live") list = list.filter((m) => m.isLive);
  else if (filter === "festival") list = list.filter((m) => m.isFestivalHub);
  else if (filter !== "all") list = list.filter((m) => m.categories.includes(filter));

  const q = search.trim().toLowerCase();
  if (!q) return list;
  return list.filter((m) => {
    const name = (m as { name?: string }).name?.toLowerCase() ?? "";
    const city = (m as { cityName?: string }).cityName?.toLowerCase() ?? "";
    return name.includes(q) || city.includes(q);
  });
}
