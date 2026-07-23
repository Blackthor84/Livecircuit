import { subDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { demoHeatPoints } from "@/lib/data/demo";
import { COUNTRY_CENTROIDS } from "@/lib/maps/heat-types";
import type { FanHeatResult, HeatGrowthWindow, HeatMapRegion, HeatPoint } from "@/lib/maps/heat-types";
import { US_STATE_CENTROIDS } from "@/lib/maps/state-centroids";

export type FanHeatQuery = {
  region?: HeatMapRegion;
  window?: HeatGrowthWindow;
  minGrowth?: number;
};

type LocBucket = {
  label: string;
  lat: number;
  lng: number;
  total: number;
  recent: number;
  prior: number;
  countryCode?: string;
};

export async function getArtistFanHeatData(
  artistId: string,
  query: FanHeatQuery = {}
): Promise<FanHeatResult> {
  const region = query.region ?? "us";
  const window = query.window ?? "all";
  const minGrowth = Math.max(0, Math.min(100, query.minGrowth ?? 0));

  if (!isSupabaseConfigured()) {
    return demoHeatResult(region, minGrowth);
  }

  const supabase = await createClient();
  const now = new Date();
  const recentStart = subDays(now, 30);
  const priorStart = subDays(now, 60);
  const window90Start = subDays(now, 90);

  const { data: rows } = await supabase
    .from("followers")
    .select(
      "created_at, profiles(country_id, state_id, city_id, countries(code), states(code, name), cities(name, latitude, longitude))"
    )
    .eq("artist_id", artistId);

  if (!rows?.length) {
    return { points: [], topLocations: [], totals: { fans: 0, filteredFans: 0 } };
  }

  const buckets = new Map<string, LocBucket>();

  for (const row of rows) {
    const createdAt = new Date(row.created_at as string);
    const profileRaw = row.profiles;
    const p = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as {
      country_id: string | null;
      state_id: string | null;
      city_id: string | null;
      countries: { code: string } | { code: string }[] | null;
      states: { code: string; name: string } | { code: string; name: string }[] | null;
      cities: { name: string; latitude: number; longitude: number } | { name: string; latitude: number; longitude: number }[] | null;
    } | null;
    if (!p) continue;

    const countries = p.countries;
    const countryCode = (Array.isArray(countries) ? countries[0]?.code : countries?.code) ?? undefined;

    if (region === "us" && countryCode && countryCode !== "US") continue;

    const geo = resolveGeo(p, countryCode);
    if (!geo) continue;

    const isRecent = createdAt >= recentStart;
    const isPrior = createdAt >= priorStart && createdAt < recentStart;
    const inWindow =
      window === "all"
        ? true
        : window === "30d"
          ? createdAt >= recentStart
          : createdAt >= window90Start;

    if (!inWindow && window !== "all") continue;

    const existing = buckets.get(geo.key);
    if (existing) {
      existing.total += 1;
      if (isRecent) existing.recent += 1;
      if (isPrior) existing.prior += 1;
    } else {
      buckets.set(geo.key, {
        label: geo.label,
        lat: geo.lat,
        lng: geo.lng,
        total: 1,
        recent: isRecent ? 1 : 0,
        prior: isPrior ? 1 : 0,
        countryCode,
      });
    }
  }

  const points: HeatPoint[] = [];
  const topLocations: FanHeatResult["topLocations"] = [];
  let filteredFans = 0;

  for (const bucket of buckets.values()) {
    const growthPercent = growthRate(bucket.recent, bucket.prior);
    if (minGrowth > 0 && growthPercent < minGrowth) continue;

    const weight = window === "30d" ? bucket.recent : bucket.total;
    if (weight <= 0) continue;

    filteredFans += weight;
    points.push({
      lat: bucket.lat,
      lng: bucket.lng,
      weight,
      label: bucket.label,
      growthPercent,
    });
    topLocations.push({ label: bucket.label, count: weight, growthPercent });
  }

  topLocations.sort((a, b) => b.count - a.count);

  return {
    points,
    topLocations: topLocations.slice(0, 8),
    totals: { fans: rows.length, filteredFans },
  };
}

function growthRate(recent: number, prior: number) {
  if (prior === 0) return recent > 0 ? 100 : 0;
  return Math.round(((recent - prior) / prior) * 100);
}

function resolveGeo(
  p: {
    states: { code: string; name: string } | { code: string; name: string }[] | null;
    cities: { name: string; latitude: number; longitude: number } | { name: string; latitude: number; longitude: number }[] | null;
  },
  countryCode?: string
) {
  const cities = p.cities;
  const city = Array.isArray(cities) ? cities[0] : cities;
  if (city?.latitude != null && city.longitude != null) {
    return {
      key: `city:${city.name}:${city.latitude}:${city.longitude}`,
      label: city.name,
      lat: city.latitude,
      lng: city.longitude,
    };
  }

  const states = p.states;
  const state = Array.isArray(states) ? states[0] : states;
  if (state?.code && US_STATE_CENTROIDS[state.code]) {
    const c = US_STATE_CENTROIDS[state.code];
    return {
      key: `state:${state.code}`,
      label: state.name ?? c.name,
      lat: c.lat,
      lng: c.lng,
    };
  }

  if (countryCode && COUNTRY_CENTROIDS[countryCode]) {
    const c = COUNTRY_CENTROIDS[countryCode];
    return {
      key: `country:${countryCode}`,
      label: c.name,
      lat: c.lat,
      lng: c.lng,
    };
  }

  return null;
}

function demoHeatResult(region: HeatMapRegion, minGrowth: number): FanHeatResult {
  let points: HeatPoint[] = demoHeatPoints.map((p) => ({
    ...p,
    growthPercent: 12 + (p.weight % 40),
  }));
  if (region === "us") {
    points = points.filter((p) => p.lng < -50);
  }
  if (minGrowth > 0) {
    points = points.filter((p) => (p.growthPercent ?? 0) >= minGrowth);
  }
  const weightSum = points.reduce((s, p) => s + p.weight, 0);
  return {
    points,
    topLocations: points.map((p) => ({
      label: p.label,
      count: p.weight,
      growthPercent: p.growthPercent,
    })),
    totals: { fans: demoHeatPoints.reduce((s, p) => s + p.weight, 0), filteredFans: weightSum },
  };
}
