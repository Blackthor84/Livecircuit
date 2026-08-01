import type { Metadata } from "next";
import { ArtistCard } from "@/components/artists/artist-card";
import { ArtistSuccessPlanBanner } from "@/components/artists/artist-success-plan-banner";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { getFeaturedArtists } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Artists" };

export default async function ArtistsPage() {
  const artists = await getFeaturedArtists(24);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Artists</h1>
      <p className="mt-2 text-muted-foreground">Follow touring artists and get notified when they reach the next city.</p>
      <div className="mt-8">
        <ArtistSuccessPlanBanner />
      </div>
      {artists.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      ) : (
        <div className="glass-panel mt-8 rounded-2xl border border-white/10 px-8 py-16 text-center">
          <p className="text-lg font-medium">Our Founding Artists will appear here soon.</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Verified creators who join LiveCircuit first will be listed here as they publish profiles.
          </p>
          <Button className="mt-6" href={`${ROUTES.register}?role=artist`}>
            Apply as a Founding Artist
          </Button>
        </div>
      )}
    </div>
  );
}
