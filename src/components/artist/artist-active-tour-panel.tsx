import Link from "next/link";
import { MapPin, Radio } from "lucide-react";
import { TourRouteMap } from "@/components/home/tour-route-map";
import { Button } from "@/components/ui/button";
import type { LiveTourSnapshot } from "@/lib/touring/tour-context";

export function ArtistActiveTourPanel({
  snapshot,
  artistSlug,
}: {
  snapshot: LiveTourSnapshot;
  artistSlug: string;
}) {
  const manageHref = `/artist/tours/${snapshot.tourId}`;
  const stopHref = snapshot.liveEventSlug
    ? `/artist/events/${snapshot.liveEventId}`
    : manageHref;

  return (
    <section className="glass-panel overflow-hidden rounded-2xl border border-primary/30 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            {snapshot.liveCity ? (
              <>
                <Radio className="size-3.5 text-red-400" />
                Tour in progress
              </>
            ) : (
              <>
                <MapPin className="size-3.5" />
                Upcoming tour
              </>
            )}
          </p>
          <h2 className="mt-2 text-xl font-bold">{snapshot.tourTitle}</h2>
          <p className="text-sm text-muted-foreground">
            {snapshot.liveCity ? (
              <>
                Currently in <span className="text-foreground">{snapshot.liveCity}</span>
                {snapshot.nextCity ? ` · Next: ${snapshot.nextCity}` : ""}
              </>
            ) : snapshot.nextCity ? (
              <>Next stop: {snapshot.nextCity}{snapshot.nextStopIn ? ` in ${snapshot.nextStopIn}` : ""}</>
            ) : (
              `${snapshot.remainingStops} stops remaining`
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" href={manageHref}>
            Manage tour
          </Button>
          {snapshot.liveEventId ? (
            <Button size="sm" href={stopHref}>
              Current stop
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" href={`/artists/${artistSlug}/tours/${snapshot.tourSlug}`}>
            Public page
          </Button>
        </div>
      </div>
      <div className="mt-6">
        <TourRouteMap
          tourName={snapshot.tourTitle}
          artistName={snapshot.artistName}
          stops={snapshot.routeStops}
          className="border-white/10 bg-black/20 p-4"
        />
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Every ticket, stream, and fan interaction on this route belongs to this tour.{" "}
        <Link href={manageHref} className="text-primary hover:underline">
          Add stops or update schedule →
        </Link>
      </p>
    </section>
  );
}
