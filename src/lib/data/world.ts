import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildWorldReport } from "@/lib/services/world.service";
import type { WorldReport } from "@/lib/types/world";

function demoWorld(): WorldReport {
  const markers = [
    {
      id: "demo-ny",
      slug: "new-york-city-arena",
      name: "New York City Arena",
      lat: 40.7128,
      lng: -74.006,
      countryCode: "US",
      countryName: "United States",
      stateCode: "NY",
      cityName: "New York",
      venueTypeSlug: "arena",
      isLive: true,
      liveEventCount: 2,
      currentVisitors: 4200,
      attendanceScore: 9200,
      weatherSummary: "Partly cloudy · 78°F",
      localTimeLabel: "7:30 PM",
      categories: ["music"],
      isFestivalHub: true,
      featuredLiveEventSlug: "summer-night",
      featuredLiveArtistSlug: "neon-nights",
      venueHref: "/livecircuit/venues/new-york-city-arena",
      concourseHref: "/livecircuit/venues/new-york-city-arena/concourse",
    },
    {
      id: "demo-la",
      slug: "los-angeles-arena",
      name: "Los Angeles Arena",
      lat: 34.0522,
      lng: -118.2437,
      countryCode: "US",
      countryName: "United States",
      stateCode: "CA",
      cityName: "Los Angeles",
      venueTypeSlug: "arena",
      isLive: false,
      liveEventCount: 0,
      currentVisitors: 1800,
      attendanceScore: 4100,
      weatherSummary: "Clear · 82°F",
      localTimeLabel: "4:30 PM",
      categories: ["music"],
      isFestivalHub: false,
      featuredLiveEventSlug: null,
      featuredLiveArtistSlug: null,
      venueHref: "/livecircuit/venues/los-angeles-arena",
      concourseHref: "/livecircuit/venues/los-angeles-arena/concourse",
    },
    {
      id: "demo-london",
      slug: "london-arena",
      name: "London Arena",
      lat: 51.5074,
      lng: -0.1278,
      countryCode: "GB",
      countryName: "United Kingdom",
      stateCode: null,
      cityName: "London",
      venueTypeSlug: "arena",
      isLive: true,
      liveEventCount: 1,
      currentVisitors: 2600,
      attendanceScore: 5500,
      weatherSummary: "Light rain · 61°F",
      localTimeLabel: "12:30 AM",
      categories: ["comedy"],
      isFestivalHub: true,
      featuredLiveEventSlug: "late-show",
      featuredLiveArtistSlug: "comedy-circuit",
      venueHref: "/livecircuit/venues/london-arena",
      concourseHref: "/livecircuit/venues/london-arena/concourse",
    },
  ];

  return {
    markers,
    trending: [
      {
        regionKey: "state:NY",
        label: "NY circuit",
        countryCode: "US",
        stateCode: "NY",
        lat: 40.7128,
        lng: -74.006,
        venueCount: 1,
        liveEventCount: 2,
        attendanceScore: 9200,
      },
      {
        regionKey: "state:CA",
        label: "CA circuit",
        countryCode: "US",
        stateCode: "CA",
        lat: 34.0522,
        lng: -118.2437,
        venueCount: 1,
        liveEventCount: 0,
        attendanceScore: 4100,
      },
    ],
    festivals: [
      {
        slug: "livecircuit-summer-fest",
        name: "LiveCircuit Summer Fest",
        status: "live",
        lat: 40.7128,
        lng: -74.006,
        href: "/festivals/livecircuit-summer-fest",
        tagline: "The flagship multi-venue spectacular",
      },
    ],
    totals: {
      venues: markers.length,
      liveVenues: 2,
      liveEvents: 3,
      densityLabel: "Growing circuit",
    },
    zoomLevel: "earth",
    computedAt: new Date().toISOString(),
  };
}

export async function getWorldReport(): Promise<WorldReport> {
  if (!isSupabaseConfigured()) return demoWorld();
  const supabase = await createClient();
  const admin = getSupabaseAdmin();
  return buildWorldReport(supabase, admin);
}
