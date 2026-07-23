import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ArtistTourListItem } from "@/lib/data/artist-tours";

export function ArtistToursList({
  tours,
  artistSlug,
}: {
  tours: ArtistTourListItem[];
  artistSlug: string;
}) {
  if (!tours.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No tours yet.{" "}
        <Link href="/artist/tours/new" className="text-primary underline-offset-4 hover:underline">
          Create your first tour
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
      {tours.map((tour) => (
        <li key={tour.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{tour.title}</p>
              <Badge variant={tour.status === "published" ? "default" : "secondary"}>{tour.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {tour.stop_count} stop{tour.stop_count === 1 ? "" : "s"}
              {tour.starts_at
                ? ` · starts ${new Date(tour.starts_at).toLocaleDateString()}`
                : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" href={`/artist/tours/${tour.id}`}>
              Manage
            </Button>
            {tour.status === "published" ? (
              <Button variant="ghost" size="sm" href={`/artists/${artistSlug}/tours/${tour.slug}`}>
                Public page
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
