import type { AgencyRosterEntry, ArtistGenre, DemoArtistEntry, ArtistMerchItem } from "@/data/demo/artists/types";
import { FEATURED_ARTIST_IDS, PRIMARY_ARTIST_DEMO_ID, VENUE_HEADLINER_MAP } from "@/data/demo/artists/constants";
import { getAvailablePoses, getArtistBrand, getArtistImages, getArtistLogo, resolvePoseImage } from "@/data/demo/artists/assets";
import { DEMO_ARTISTS, DEMO_ARTISTS_BY_ID } from "@/data/demo/artists/registry";
import { filterArtistsByEnvironment } from "@/data/shared/environment";

const DEMO_ROSTER = filterArtistsByEnvironment(DEMO_ARTISTS, "demo");

export function getArtistById(id: string): DemoArtistEntry | undefined {
  const artist = DEMO_ARTISTS_BY_ID.get(id);
  return artist?.isDemoArtist ? artist : undefined;
}

export function getArtistByStageName(name: string): DemoArtistEntry | undefined {
  return DEMO_ROSTER.find((a) => a.stageName.toLowerCase() === name.toLowerCase());
}

export function getAllArtists(): readonly DemoArtistEntry[] {
  return DEMO_ROSTER;
}

export function getArtistsByGenre(genre: ArtistGenre): DemoArtistEntry[] {
  return DEMO_ROSTER.filter((a) => a.genre === genre);
}

export function getFeaturedArtists(): DemoArtistEntry[] {
  return FEATURED_ARTIST_IDS.map((id) => getArtistById(id)).filter(Boolean) as DemoArtistEntry[];
}

export function getTrendingArtists(limit = 12): DemoArtistEntry[] {
  return [...DEMO_ROSTER]
    .sort((a, b) => b.monthlyListeners - a.monthlyListeners || b.growthPct - a.growthPct)
    .slice(0, limit);
}

export function getPrimaryDemoArtist(): DemoArtistEntry {
  return getArtistById(PRIMARY_ARTIST_DEMO_ID) ?? DEMO_ROSTER[0]!;
}

export function getVenueHeadliner(venueId: string): DemoArtistEntry {
  const id = VENUE_HEADLINER_MAP[venueId] ?? PRIMARY_ARTIST_DEMO_ID;
  return getArtistById(id) ?? getPrimaryDemoArtist();
}

export function getArtistMerch(artistId: string): ArtistMerchItem[] {
  return getArtistById(artistId)?.merchCollection ?? [];
}

export function getUpcomingShows(artistId: string) {
  return getArtistById(artistId)?.currentTour.upcomingShows ?? [];
}

export function getCurrentTour(artistId: string) {
  return getArtistById(artistId)?.currentTour;
}

export function getAgencyRoster(limit = 12): AgencyRosterEntry[] {
  const priority = ["LIVE", "ON TOUR", "REHEARSAL", "IDLE"] as const;
  return [...DEMO_ROSTER]
    .sort((a, b) => priority.indexOf(a.liveStatus) - priority.indexOf(b.liveStatus) || b.followers - a.followers)
    .slice(0, limit)
    .map((a) => ({
      id: a.id,
      name: a.stageName,
      avatar: a.avatarInitials,
      genre: a.genre,
      show: a.currentTour.upcomingShows[0]?.venue ?? "LiveCircuit Arena",
      manager: a.management,
      liveAudience: a.liveAudience,
      revenue: a.revenueTonight,
      followers: a.followers,
      shows: a.showsScheduled,
      merch: Math.round(a.merchRevenue / 100),
      status: a.liveStatus,
      color: a.brand.gradientClass,
      growth: a.growthPct,
    }));
}

export function getStagePerformerSelection(artistId: string, pose: Parameters<typeof resolvePoseImage>[1] = "performance") {
  const artist = getArtistById(artistId);
  if (!artist) return null;
  return {
    artistId: artist.id,
    artistName: artist.stageName,
    band: artist.actType !== "solo" ? artist.stageName : undefined,
    pose,
    src: resolvePoseImage(artist, pose),
    alt: `${artist.stageName} — ${artist.genre} performance`,
  };
}

export {
  getArtistLogo,
  getArtistImages,
  getArtistBrand,
  getAvailablePoses,
  resolvePoseImage,
};
