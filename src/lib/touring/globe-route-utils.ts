/** Great-circle arc coordinates between two lng/lat points for globe route animation. */
export function arcCoordinates(
  start: [number, number],
  end: [number, number],
  segments = 64
): [number, number][] {
  const [lng1, lat1] = start;
  const [lng2, lat2] = end;

  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const λ1 = toRad(lng1);
  const φ1 = toRad(lat1);
  const λ2 = toRad(lng2);
  const φ2 = toRad(lat2);

  const Δλ = λ2 - λ1;
  const Δφ = φ2 - φ1;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const δ = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  if (δ === 0) return [start, end];

  const coords: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const f = i / segments;
    const A = Math.sin((1 - f) * δ) / Math.sin(δ);
    const B = Math.sin(f * δ) / Math.sin(δ);
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);
    coords.push([toDeg(Math.atan2(y, x)), toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)))]);
  }
  return coords;
}

/** Build animated route segments: completed (solid), active leg (animated), upcoming (dim). */
export function buildRouteSegments(
  stops: { lng: number; lat: number; status: string }[]
): {
  completed: [number, number][];
  active: [number, number][];
  upcoming: [number, number][];
} {
  const completed: [number, number][] = [];
  const active: [number, number][] = [];
  const upcoming: [number, number][] = [];

  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i];
    const to = stops[i + 1];
    const arc = arcCoordinates([from.lng, from.lat], [to.lng, to.lat]);

    const fromStatus = from.status;
    const toStatus = to.status;

    if (fromStatus === "completed" && toStatus === "completed") {
      if (completed.length === 0) completed.push(...arc);
      else completed.push(...arc.slice(1));
    } else if (
      fromStatus === "completed" &&
      (toStatus === "live" || toStatus === "next" || toStatus === "upcoming")
    ) {
      if (active.length === 0) active.push(...arc);
      else active.push(...arc.slice(1));
    } else if (fromStatus === "live" || toStatus === "live") {
      if (active.length === 0) active.push(...arc);
      else active.push(...arc.slice(1));
    } else {
      if (upcoming.length === 0) upcoming.push(...arc);
      else upcoming.push(...arc.slice(1));
    }
  }

  return { completed, active, upcoming };
}
