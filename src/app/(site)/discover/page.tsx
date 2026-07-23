import type { Metadata } from "next";
import Link from "next/link";
import { ArtistCard } from "@/components/artists/artist-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ARTIST_CATEGORIES } from "@/lib/constants";
import { getFeaturedArtists, getUpcomingEvents } from "@/lib/data/queries";
import { formatCents } from "@/lib/format";

export const metadata: Metadata = {
  title: "Discover",
  description: "Trending artists, live shows near you, and virtual tours worldwide.",
};

export default async function DiscoverPage() {
  const [artists, events] = await Promise.all([
    getFeaturedArtists(12),
    getUpcomingEvents(8),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Discover live experiences</h1>
        <p className="mt-3 text-muted-foreground">
          Browse by genre, city, and tour — from arena-scale streams to intimate VIP rooms.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap gap-2">
        {ARTIST_CATEGORIES.map((cat) => (
          <Badge key={cat.value} variant="secondary" className="cursor-pointer capitalize hover:bg-primary/20">
            {cat.label}
          </Badge>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Trending artists</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {artists.map((a) => (
            <ArtistCard key={a.id} artist={a} />
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-semibold">Starting soon</h2>
        <div className="mt-6 space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="glass-panel flex flex-col justify-between gap-4 rounded-xl p-4 sm:flex-row sm:items-center"
            >
              <div>
                <p className="font-medium">{event.title}</p>
                <p className="text-sm text-muted-foreground">
                  {event.artists?.stage_name} · {event.tour_stops?.virtual_location_label}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm">{formatCents(event.tour_stops?.ticket_price_cents ?? 0)}</span>
                <Button size="sm" href={`/artists/${event.artists?.slug}/events/${event.slug}`}>
                  Watch
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
