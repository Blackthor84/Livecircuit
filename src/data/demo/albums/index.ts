/**
 * Demo albums — derived from demo artist catalog.
 * Import only from demo routes and demo components.
 */
import { getAllArtists } from "@/data/demo/artists/queries";

export function getDemoAlbums() {
  return getAllArtists().map((a) => ({
    artistId: a.id,
    artistName: a.stageName,
    title: a.albumTitle,
    coverPath: a.images.albumCover,
    singleTitle: a.singleTitle,
    isDemoArtist: true as const,
    environment: "demo" as const,
  }));
}
