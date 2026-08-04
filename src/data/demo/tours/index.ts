/**
 * Demo tours — derived from demo artist currentTour data.
 * Import only from demo routes and demo components.
 */
import { getAllArtists } from "@/data/demo/artists/queries";

export function getDemoTours() {
  return getAllArtists().map((a) => ({
    artistId: a.id,
    artistName: a.stageName,
    ...a.currentTour,
    isDemoArtist: true as const,
    environment: "demo" as const,
  }));
}
