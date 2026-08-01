"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { artistProfileUrl } from "@/lib/username";

type SearchArtist = {
  slug: string;
  stage_name: string;
  category: string;
  profiles?: { username?: string | null; cities?: { name: string } | null } | null;
};

type SearchTour = {
  slug: string;
  title: string;
  artists: { slug: string; stage_name: string; profiles?: { username?: string | null } | null };
};

type SearchTourStop = {
  tour_city: string | null;
  virtual_location_label: string | null;
  scheduled_at: string;
  tours: SearchTour;
};

type SearchEvent = {
  slug: string;
  title: string;
  artists: { slug: string; profiles?: { username?: string } | null } | null;
};

function tourFromStop(row: SearchTourStop): SearchTour {
  return row.tours;
}

function tourHref(tour: SearchTour) {
  const username = tour.artists.profiles?.username ?? tour.artists.slug;
  return `/artists/${username}/tours/${tour.slug}`;
}

export function SearchForm() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    artists: SearchArtist[];
    tours: SearchTour[];
    tourStops: SearchTourStop[];
    events: SearchEvent[];
  } | null>(null);

  function artistHref(artist: { slug: string; profiles?: { username?: string | null } | null }) {
    const username = artist.profiles?.username ?? artist.slug;
    return artistProfileUrl(username);
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    setResults(await res.json());
  }

  return (
    <div className="space-y-6">
      <form onSubmit={search} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tour, artist, city, arena, genre…"
        />
        <Button type="submit">Search</Button>
      </form>
      {results && (
        <div className="space-y-6">
          {results.tours.length > 0 ? (
            <div>
              <h2 className="font-medium">Tours</h2>
              <ul className="mt-2 space-y-2 text-sm">
                {results.tours.map((tour) => (
                  <li key={tour.slug}>
                    <Link href={tourHref(tour)} className="text-primary hover:underline">
                      {tour.title}
                    </Link>
                    <span className="text-muted-foreground"> · {tour.artists.stage_name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {results.tourStops.length > 0 ? (
            <div>
              <h2 className="font-medium">Tour stops</h2>
              <ul className="mt-2 space-y-2 text-sm">
                {results.tourStops.map((stop) => {
                  const tour = tourFromStop(stop);
                  const city = stop.tour_city ?? stop.virtual_location_label ?? "Tour stop";
                  return (
                    <li key={`${tour.slug}-${city}-${stop.scheduled_at}`}>
                      <Link href={tourHref(tour)} className="text-primary hover:underline">
                        {city}
                      </Link>
                      <span className="text-muted-foreground">
                        {" "}
                        · {tour.title} · {new Date(stop.scheduled_at).toLocaleDateString()}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          <div>
            <h2 className="font-medium">Artists</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {results.artists.map((a) => (
                <li key={a.slug}>
                  <Link href={artistHref(a)} className="text-primary hover:underline">
                    {a.stage_name}
                  </Link>
                  <span className="text-muted-foreground">
                    {" "}
                    · {a.category}
                    {a.profiles?.cities?.name ? ` · ${a.profiles.cities.name}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-medium">Tour stops (events)</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {results.events.map((ev) => (
                <li key={ev.slug}>
                  <Link
                    href={`/artists/${ev.artists?.profiles?.username ?? ev.artists?.slug}/events/${ev.slug}`}
                    className="text-primary hover:underline"
                  >
                    {ev.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
