"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchForm() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    artists: { slug: string; stage_name: string; category: string }[];
    events: { slug: string; title: string; artists: { slug: string } | null }[];
  } | null>(null);

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
                  <Link href={`/artists/${a.slug}`} className="text-primary hover:underline">
                    {a.stage_name}
                  </Link>
                  <span className="text-muted-foreground"> · {a.category}</span>
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
                    href={`/artists/${ev.artists?.slug}/events/${ev.slug}`}
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
