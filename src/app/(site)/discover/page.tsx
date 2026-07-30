import type { Metadata } from "next";
import Link from "next/link";
import { ArtistCard } from "@/components/artists/artist-card";
import { TourDiscoverySection } from "@/components/touring/tour-discovery-section";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { getFeaturedArtists } from "@/lib/data/queries";
import { HOMEPAGE_CATEGORY_CARDS } from "@/lib/home/marketing-content";
import { getSessionUser } from "@/lib/auth/session";
import { discoverTourEvents, getFanLocationContext } from "@/lib/virtual-touring/discovery";
import type { TourDiscoveryFilter } from "@/lib/virtual-touring/types";

export const metadata: Metadata = {
  title: "Discover",
  description:
    "Discover live music, comedy, podcasts, virtual concerts, and ticketed livestreams on LiveCircuit.",
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
          Real artists, real events — concerts, comedy, podcasts, and creators from anywhere in the world.
        </p>
        {fanLocation?.cityName ? (
          <p className="mt-2 text-sm text-primary">
            Your home base: {fanLocation.cityName}
            {fanLocation.stateCode ? `, ${fanLocation.stateCode}` : ""}
          </p>
        ) : null}
      </header>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Browse by category</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {HOMEPAGE_CATEGORY_CARDS.map((cat) => (
            <Link
              key={cat.query}
              href={`${ROUTES.search}?q=${encodeURIComponent(cat.label)}`}
              className="glass-panel rounded-xl border border-white/10 p-4 transition hover:border-primary/40"
            >
              <span className="text-xl">{cat.emoji}</span>
              <p className="mt-2 text-sm font-medium">{cat.label}</p>
            </Link>
          ))}
        </div>
      </section>

      <TourDiscoverySection events={events} activeFilter={filter} />

      {events.length === 0 ? (
        <div className="glass-panel mt-8 rounded-2xl border border-white/10 px-8 py-12 text-center">
          <p className="text-lg font-medium">Upcoming performances will appear here.</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            When artists publish real shows, you&apos;ll find them here — never placeholder events.
          </p>
        </div>
      ) : null}

      <section className="mt-16">
        <h2 className="text-xl font-semibold">Trending artists</h2>
        {artists.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {artists.map((a) => (
              <ArtistCard key={a.id} artist={a} />
            ))}
          </div>
        ) : (
          <div className="glass-panel mt-6 rounded-2xl border border-white/10 px-8 py-12 text-center">
            <p className="font-medium">Our Founding Artists will appear here soon.</p>
            <Button className="mt-4" href={`${ROUTES.register}?role=artist`}>
              Apply as a Founding Artist
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
