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
        No upcoming events yet.{" "}
        <Link href="/artist/events/new" className="text-primary hover:underline">
          Create your first event
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

        return (
          <li key={event.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{event.title}</p>
                <Badge variant={statusVariant(event.status)}>{event.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {event.tour_stops?.virtual_location_label ?? "Virtual"} · {scheduled}
              </p>
              <p className="text-sm text-muted-foreground">
                Tickets {formatCents(event.tour_stops?.ticket_price_cents ?? 0)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" href={`/artist/events/${event.id}`}>
                Event details
              </Button>
              {event.status === "live" ? (
                <Button size="sm" href={livePath}>
                  Enter live room
                </Button>
              ) : (
                <Button size="sm" variant="secondary" href={publicPath}>
                  Preview page
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
