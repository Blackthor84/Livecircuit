import Link from "next/link";
import { ArrowRight, MapPin, Radio, Users } from "lucide-react";
import { TourRouteMap } from "@/components/home/tour-route-map";
import { Button } from "@/components/ui/button";
import type { LiveTourSnapshot } from "@/lib/touring/tour-context";

export function LiveTourExperience({ snapshot }: { snapshot: LiveTourSnapshot }) {
  const tourHref = `/artists/${snapshot.artistSlug}/tours/${snapshot.tourSlug}`;
  const stopHref = snapshot.liveEventSlug
    ? `/artists/${snapshot.artistSlug}/events/${snapshot.liveEventSlug}`
    : tourHref;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="glass-panel overflow-hidden rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-950/40 via-background to-primary/5 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-red-400">
              <Radio className="size-3.5" />
              Active digital tour
            </p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{snapshot.tourTitle}</h2>
            <p className="mt-1 text-muted-foreground">{snapshot.artistName}</p>
          </div>
          <Button href={stopHref}>Join current stop</Button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Current city</p>
            <p className="mt-1 flex items-center gap-1.5 font-semibold text-red-300">
              <MapPin className="size-3.5" />
              {snapshot.liveCity ?? "On tour"}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Next city</p>
            <p className="mt-1 font-semibold">{snapshot.nextCity ?? "Final stop"}</p>
            {snapshot.nextStopIn ? (
              <p className="text-xs text-muted-foreground">in {snapshot.nextStopIn}</p>
            ) : null}
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Remaining stops</p>
            <p className="mt-1 font-semibold">{snapshot.remainingStops}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">In the audience</p>
            <p className="mt-1 flex items-center gap-1.5 font-semibold">
              <Users className="size-3.5" />
              {snapshot.viewerCount.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-8">
          <TourRouteMap
            tourName={snapshot.tourTitle}
            artistName={snapshot.artistName}
            stops={snapshot.routeStops}
            className="border-red-500/20 bg-black/20"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="secondary" href={tourHref}>
            Follow tour
            <ArrowRight className="size-4" />
          </Button>
          <Link href={tourHref} className="text-sm text-primary hover:underline">
            View full tour timeline →
          </Link>
        </div>
      </div>
    </section>
  );
}
