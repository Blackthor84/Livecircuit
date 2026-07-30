import type { FanPassportStamp } from "@/lib/types/fan-passport";
import type { TourPassportStats } from "@/lib/virtual-touring/types";

export function computeTourPassportStats(stamps: FanPassportStamp[]): TourPassportStats {
  const cities = new Set<string>();
  const states = new Set<string>();
  const tours = new Set<string>();
  const artists = new Set<string>();

  for (const stamp of stamps) {
    if (stamp.cityName) cities.add(stamp.cityName);
    if (stamp.stateCode) states.add(stamp.stateCode);
    if (stamp.tourId) tours.add(stamp.tourId);
    if (stamp.artistName) artists.add(stamp.artistName);
  }

  const distinctCityCount = cities.size;
  const targetCities = 25;
  const completionPercent = Math.min(100, Math.round((distinctCityCount / targetCities) * 100));

  return {
    citiesVisited: [...cities].sort(),
    statesVisited: [...states].sort(),
    toursCompleted: tours.size,
    artistsFollowedOnTour: artists.size,
    completionPercent,
    distinctCityCount,
    distinctStateCount: states.size,
  };
}
