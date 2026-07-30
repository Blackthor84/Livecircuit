import { US_STATE_NAMES } from "@/lib/virtual-touring/constants";
import type { FanProfileLocation, TourStopLocation } from "@/lib/virtual-touring/types";

export function stateNameFromCode(code: string | null | undefined): string | null {
  if (!code) return null;
  return US_STATE_NAMES[code.toUpperCase()] ?? code;
}

/** Parse "Boston, MA" or "Manchester, NH" into structured location. */
export function parseTourLocationInput(input: string): TourStopLocation {
  const trimmed = input.trim();
  const commaMatch = trimmed.match(/^(.+?),\s*([A-Za-z]{2})$/);
  if (commaMatch) {
    const city = commaMatch[1]?.trim() ?? trimmed;
    const stateCode = commaMatch[2]?.toUpperCase() ?? null;
    return {
      tourCity: city,
      tourStateCode: stateCode,
      tourStateName: stateNameFromCode(stateCode),
    };
  }
  return {
    tourCity: trimmed || null,
    tourStateCode: null,
    tourStateName: null,
  };
}

export function buildVirtualLocationLabel(city: string, stateCode?: string | null): string {
  if (stateCode) return `${city}, ${stateCode}`;
  return city;
}

export function normalizeCityName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function profileMatchesStop(
  profile: FanProfileLocation,
  stop: TourStopLocation
): boolean {
  if (!stop.tourCity && !stop.tourStateCode) return false;

  const profileCity = normalizeCityName(profile.cityName);
  const stopCity = normalizeCityName(stop.tourCity);

  if (profileCity && stopCity && profileCity === stopCity) return true;

  const profileState = profile.stateCode?.toUpperCase();
  const stopState = stop.tourStateCode?.toUpperCase();
  if (profileState && stopState && profileState === stopState) return true;

  return false;
}

export function profileIsUnitedStates(profile: FanProfileLocation): boolean {
  if (profile.countryCode?.toUpperCase() === "US") return true;
  if (profile.stateCode && US_STATE_NAMES[profile.stateCode.toUpperCase()]) return true;
  return false;
}

export function formatTourStopDate(iso: string, timeZone = "America/New_York"): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleDateString();
  }
}

export function formatTourStopTime(iso: string, timeZone = "America/New_York"): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
}
