import type { WorldCategoryFilter, WorldZoomLevel } from "@/lib/constants/world";

export type WorldVenueMarker = {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  countryCode: string | null;
  countryName: string | null;
  stateCode: string | null;
  cityName: string | null;
  venueTypeSlug: string | null;
  isLive: boolean;
  liveEventCount: number;
  currentVisitors: number;
  attendanceScore: number;
  weatherSummary: string | null;
  localTimeLabel: string;
  categories: string[];
  isFestivalHub: boolean;
  featuredLiveEventSlug: string | null;
  featuredLiveArtistSlug: string | null;
  venueHref: string;
  concourseHref: string;
};

export type WorldTrendingRegion = {
  regionKey: string;
  label: string;
  countryCode: string | null;
  stateCode: string | null;
  lat: number;
  lng: number;
  venueCount: number;
  liveEventCount: number;
  attendanceScore: number;
};

export type WorldFestivalPin = {
  slug: string;
  name: string;
  status: string;
  lat: number;
  lng: number;
  href: string;
  tagline: string | null;
};

export type WorldReport = {
  markers: WorldVenueMarker[];
  trending: WorldTrendingRegion[];
  festivals: WorldFestivalPin[];
  totals: {
    venues: number;
    liveVenues: number;
    liveEvents: number;
    densityLabel: string;
  };
  zoomLevel: WorldZoomLevel;
  computedAt: string;
};

export type WorldSelectedPlace = {
  zoomLevel: WorldZoomLevel;
  label: string;
  marker: WorldVenueMarker | null;
};

export type { WorldCategoryFilter };
