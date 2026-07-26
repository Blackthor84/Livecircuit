"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { artistProfileUrl } from "@/lib/username";

export function SearchForm() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    artists: {
      slug: string;
      stage_name: string;
      category: string;
      profiles?: { username?: string | null; cities?: { name: string } | null } | null;
    }[];
    events: { slug: string; title: string; artists: { slug: string; profiles?: { username?: string } | null } | null }[];
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
          placeholder="Artist, city, genre, event…"
        />
        <Button type="submit">Search</Button>
      </form>
      {results && (
        <div className="space-y-6">
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
            <h2 className="font-medium">Events</h2>
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
