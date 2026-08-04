/**
 * Production artist registry — real platform artists only.
 * Does NOT import demo data.
 */
import type { ArtistGenre, ProductionArtistEntry, AgencyRosterEntry, ArtistMerchItem } from "@/data/shared/artist-types";
import { filterArtistsByEnvironment } from "@/data/shared/environment";

/** Populated from database/CMS in production — empty static registry for now */
const PRODUCTION_ARTISTS: readonly ProductionArtistEntry[] = Object.freeze([]);

const PRODUCTION_ROSTER = filterArtistsByEnvironment(PRODUCTION_ARTISTS, "production");

export function getArtistById(id: string): ProductionArtistEntry | undefined {
  return PRODUCTION_ROSTER.find((a) => a.id === id);
}

export function getArtistByStageName(name: string): ProductionArtistEntry | undefined {
  return PRODUCTION_ROSTER.find((a) => a.stageName.toLowerCase() === name.toLowerCase());
}

export function getAllArtists(): readonly ProductionArtistEntry[] {
  return PRODUCTION_ROSTER;
}

export function getArtistsByGenre(genre: ArtistGenre): ProductionArtistEntry[] {
  return PRODUCTION_ROSTER.filter((a) => a.genre === genre);
}

export function getFeaturedArtists(): ProductionArtistEntry[] {
  return PRODUCTION_ROSTER.filter((a) => a.featured);
}

export function getTrendingArtists(limit = 12): ProductionArtistEntry[] {
  return [...PRODUCTION_ROSTER]
    .sort((a, b) => b.monthlyListeners - a.monthlyListeners || b.growthPct - a.growthPct)
    .slice(0, limit);
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

export function getAgencyRoster(_limit = 12): AgencyRosterEntry[] {
  return [];
}

export { PRODUCTION_ARTISTS, PRODUCTION_ROSTER };
