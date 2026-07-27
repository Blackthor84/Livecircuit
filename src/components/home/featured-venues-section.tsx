import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { VenueNamingBadge, venueCardTitle } from "@/components/venues/venue-naming-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { VenueListItem } from "@/lib/data/venues";
import { ROUTES } from "@/lib/constants";
import { hasActiveVenueSponsorship } from "@/lib/venues/display-name";

export function FeaturedVenuesSection({ venues }: { venues: VenueListItem[] }) {
  if (!venues.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-primary">LiveCircuit Venues</p>
          <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">Permanent arenas. Changeable names.</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Every venue keeps a permanent URL while sponsors can put their brand on the marquee.
          </p>
        </div>
        <Button variant="secondary" href={ROUTES.venues}>
          Browse all venues
          <ArrowRight className="size-4" />
        </Button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {venues.map((venue) => {
          const title = venueCardTitle(venue);
          const sponsored = hasActiveVenueSponsorship(venue);
          const image =
            venue.hero_image_url ??
            venue.banner_url ??
            `https://picsum.photos/seed/venue-${venue.slug}/800/600`;

          return (
            <Link key={venue.id} href={`/livecircuit/venues/${venue.slug}`}>
              <Card className="group overflow-hidden border-white/10 bg-card/80 p-0 transition hover:border-primary/30">
                <div className="relative aspect-[16/9] overflow-hidden">
                  <Image
                    src={image}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  <div className="absolute left-3 top-3">
                    <VenueNamingBadge venue={venue} size="sm" />
                  </div>
                  {sponsored && venue.sponsor_logo_url ? (
                    <div className="absolute right-3 top-3 rounded-lg bg-black/50 p-1.5 backdrop-blur-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={venue.sponsor_logo_url}
                        alt={venue.sponsor_company ?? "Sponsor"}
                        className="h-8 w-auto max-w-[80px] object-contain"
                      />
                    </div>
                  ) : null}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-lg font-semibold leading-tight text-white">{title}</p>
                    <p className="mt-1 text-xs text-white/70">
                      {venue.region}
                      {venue.state_code ? `, ${venue.state_code}` : ""}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
