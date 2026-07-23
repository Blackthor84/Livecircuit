import type { FanPassportAchievementDef, FanPassportProgress } from "@/lib/types/fan-passport";

export function metricValue(metric: string, progress: FanPassportProgress, foundingFanEarned: boolean) {
  switch (metric) {
    case "stamp_count":
      return progress.stampCount;
    case "distinct_countries":
      return progress.distinctCountries;
    case "distinct_us_states":
      return progress.distinctUsStates;
    case "vip_stamps":
      return progress.vipStamps;
    case "comedy_stamps":
      return progress.comedyStamps;
    case "special_stamps":
      return progress.specialStamps;
    case "founding_fan":
      return foundingFanEarned ? 1 : 0;
    default:
      return 0;
  }
}

export function resolveTarget(def: FanPassportAchievementDef, progress: FanPassportProgress) {
  if (def.metric === "distinct_countries") return progress.countryTarget;
  if (def.metric === "distinct_us_states") return progress.usStateTarget;
  return def.targetValue;
}

export function isAchievementEarned(
  def: FanPassportAchievementDef,
  progress: FanPassportProgress,
  foundingFanEarned: boolean
) {
  const current = metricValue(def.metric, progress, foundingFanEarned);
  const target = resolveTarget(def, progress);
  return current >= target && target > 0;
}
