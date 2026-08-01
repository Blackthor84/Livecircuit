import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/format";
import { eventLivePath, eventPublicPath, type ArtistEventListItem } from "@/lib/data/artist-events";
import type { EventStatus } from "@/types/database";

function statusVariant(status: EventStatus) {
  switch (status) {
    case "live":
      return "destructive" as const;
    case "scheduled":
      return "default" as const;
    default:
      return "secondary" as const;
  }
}

export function ArtistUpcomingEvents({
  events,
  artistSlug,
}: {
  events: ArtistEventListItem[];
  artistSlug: string;
}) {
  if (!events.length) {
    return (
      <p className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-muted-foreground">
        No upcoming tour stops yet.{" "}
        <Link href="/artist/tours/new" className="text-primary hover:underline">
          Create your first tour
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="divide-y divide-white/10 rounded-xl border border-white/10 bg-card/50">
      {events.map((event) => {
        const publicPath = eventPublicPath(artistSlug, event.slug);
        const livePath = eventLivePath(artistSlug, event.slug);
        const scheduled = new Date(event.scheduled_at).toLocaleString();
        const tour = event.tour_stops?.tours;
        const stopLabel = event.tour_stops?.virtual_location_label ?? "Tour stop";

        return (
          <li key={event.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{event.title}</p>
                <Badge variant={statusVariant(event.status)}>{event.status}</Badge>
              </div>
              {tour ? (
                <p className="mt-1 text-sm text-primary">
                  <Link href={`/artist/tours/${tour.id}`} className="hover:underline">
                    {tour.title}
                  </Link>
                  {event.tour_stops?.stop_order != null
                    ? ` · Stop ${event.tour_stops.stop_order}`
                    : ""}
                </p>
              ) : null}
              <p className="mt-1 text-sm text-muted-foreground">
                {stopLabel} · {scheduled}
              </p>
              <p className="text-sm text-muted-foreground">
                Tickets {formatCents(event.tour_stops?.ticket_price_cents ?? 0)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {tour ? (
                <Button variant="outline" size="sm" href={`/artist/tours/${tour.id}`}>
                  Manage tour
                </Button>
              ) : null}
              <Button variant="outline" size="sm" href={`/artist/events/${event.id}`}>
                Stop details
              </Button>
              {event.status === "live" ? (
                <Button size="sm" href={livePath}>
                  Current stop
                </Button>
              ) : (
                <Button size="sm" variant="secondary" href={publicPath}>
                  Preview stop
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
