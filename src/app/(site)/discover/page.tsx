import type { Metadata } from "next";
import { ArtistCard } from "@/components/artists/artist-card";
import { TourDiscoverySection } from "@/components/touring/tour-discovery-section";
import { ARTIST_CATEGORIES } from "@/lib/constants";
import { getFeaturedArtists } from "@/lib/data/queries";
import { getSessionUser } from "@/lib/auth/session";
import { discoverTourEvents, getFanLocationContext } from "@/lib/virtual-touring/discovery";
import type { TourDiscoveryFilter } from "@/lib/virtual-touring/types";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Discover",
  description: "Trending artists, live shows near you, and virtual tours worldwide.",
};

type PageProps = {
  searchParams: Promise<{ filter?: string }>;
};

export default async function DiscoverPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filter = (params.filter ?? "upcoming_stops") as TourDiscoveryFilter;
  const user = await getSessionUser();
  const fanLocation = user ? await getFanLocationContext(user.id) : null;

  const [artists, events] = await Promise.all([
    getFeaturedArtists(12),
    discoverTourEvents(filter, fanLocation, 12),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Discover live experiences</h1>
        <p className="mt-3 text-muted-foreground">
          Follow artists on a real tour — city by city — from anywhere in the world.
        </p>
        {fanLocation?.cityName ? (
          <p className="mt-2 text-sm text-primary">
            Your home base: {fanLocation.cityName}
            {fanLocation.stateCode ? `, ${fanLocation.stateCode}` : ""}
          </p>
        ) : null}
      </header>

      <div className="mt-8 flex flex-wrap gap-2">
        {ARTIST_CATEGORIES.map((cat) => (
          <Badge key={cat.value} variant="secondary" className="cursor-pointer capitalize hover:bg-primary/20">
            {cat.label}
          </Badge>
        ))}
      </div>

      <TourDiscoverySection events={events} activeFilter={filter} />

      <section className="mt-16">
        <h2 className="text-xl font-semibold">Trending artists</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {artists.map((a) => (
            <ArtistCard key={a.id} artist={a} />
          ))}
        </div>
      </section>
    </div>
  );
}
