import type { Metadata } from "next";
import Link from "next/link";
import { VenueCard } from "@/components/venues/venue-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listVenuesPublic, getVenueTypes } from "@/lib/data/venues";
import { getActiveThemeChipsForVenues } from "@/lib/data/venue-themes";

export const metadata: Metadata = {
  title: "Virtual Venues",
  description: "Browse regional arenas, theaters, and festival grounds on the LiveCircuit venue network.",
};

type PageProps = {
  searchParams: Promise<{ venueType?: string; liveNow?: string; sort?: string; state?: string }>;
};

export default async function VenuesDirectoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [result, types] = await Promise.all([
    listVenuesPublic({
      page: 1,
      limit: 48,
      venueType: params.venueType,
      stateCode: params.state,
      liveNow: params.liveNow === "true" ? "true" : undefined,
      sort: (params.sort as "popularity" | "name" | "visitors") ?? "popularity",
    }),
    getVenueTypes(),
  ]);

  const themeChips = await getActiveThemeChipsForVenues(result.items.map((v) => v.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          <span className="text-gradient">LiveCircuit</span> venues
        </h1>
        <p className="mt-3 text-muted-foreground">
          Permanent virtual arenas and halls by region — unlimited simultaneous shows under one roof.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={!params.venueType && params.liveNow !== "true" ? "default" : "secondary"}
          href="/livecircuit/venues"
        >
          All
        </Button>
        <Button
          size="sm"
          variant={params.liveNow === "true" ? "default" : "secondary"}
          href="/livecircuit/venues?liveNow=true"
        >
          Live now
        </Button>
        {types.map((t) => (
          <Button
            key={t.slug}
            size="sm"
            variant={params.venueType === t.slug ? "default" : "secondary"}
            href={`/livecircuit/venues?venueType=${t.slug}`}
          >
            {t.name}
          </Button>
        ))}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        {result.total} venue{result.total === 1 ? "" : "s"}
        {params.liveNow === "true" ? " with live performances" : ""}
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((venue) => (
          <VenueCard key={venue.id} venue={venue} themeChip={themeChips.get(venue.id) ?? null} />
        ))}
      </div>

      {!result.items.length ? (
        <div className="glass-panel mt-12 rounded-xl p-10 text-center">
          <p className="text-muted-foreground">No venues match this filter yet.</p>
          <Button className="mt-4" variant="secondary" href="/livecircuit/venues">
            View all venues
          </Button>
        </div>
      ) : null}

      <section className="mt-16 glass-panel rounded-xl p-6">
        <h2 className="text-lg font-semibold">Regional discovery</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Filter by venue type or see who&apos;s live. Full maps and heat views arrive with upcoming
          releases.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {["NY", "CA", "TX", "FL", "WA"].map((code) => (
            <Link key={code} href={`/livecircuit/venues?state=${code}`}>
              <Badge variant="outline" className="cursor-pointer hover:bg-white/5">
                {code} regions
              </Badge>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
