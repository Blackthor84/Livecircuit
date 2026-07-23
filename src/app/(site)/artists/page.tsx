import type { Metadata } from "next";
import { ArtistCard } from "@/components/artists/artist-card";
import { getFeaturedArtists } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Artists" };

export default async function ArtistsPage() {
  const artists = await getFeaturedArtists(24);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Artists</h1>
      <p className="mt-2 text-muted-foreground">Follow creators and get notified when they hit your city.</p>
      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {artists.map((artist) => (
          <ArtistCard key={artist.id} artist={artist} />
        ))}
      </div>
    </div>
  );
}
