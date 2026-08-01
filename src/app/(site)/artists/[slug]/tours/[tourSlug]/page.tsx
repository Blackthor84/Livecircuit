import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TourRouteMap } from "@/components/home/tour-route-map";
import { TourGlobeMap } from "@/components/home/tour-globe-map";
import { TourTimeline } from "@/components/home/tour-timeline";
import { FollowTourButton } from "@/components/touring/follow-tour-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSessionUser } from "@/lib/auth/session";
import { getTourWithStops } from "@/lib/data/queries";
import { getTourProducts, isFollowingTour } from "@/lib/data/tour-followers";
import { formatCents } from "@/lib/format";
import { buildGlobeStopsFromTourStops } from "@/lib/touring/globe-stops";
import { TOUR_TYPE_LABELS } from "@/lib/touring/tour-templates";
import { getNextStop, mapStopsToRouteStatus } from "@/lib/touring/tour-route-status";

type Props = { params: Promise<{ slug: string; tourSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tourSlug } = await params;
  return {
    title: `${tourSlug.replace(/-/g, " ")} — Digital Tour`,
    description: "Follow this digital tour stop by stop — real cities, real arenas, real audiences.",
  };
}

export default async function TourPage({ params }: Props) {
  const { slug, tourSlug } = await params;
  const data = await getTourWithStops(slug, tourSlug);
  if (!data) notFound();

  const { artist, tour, stops } = data;
  const routeStops = mapStopsToRouteStatus(stops);
  const globeStops = buildGlobeStopsFromTourStops(stops, routeStops);
  const nextStop = getNextStop(routeStops);
  const nextStopRow = stops.find((_, i) => routeStops[i]?.status === "next");

  const user = await getSessionUser();
  const [following, tourProducts] = await Promise.all([
    user ? isFollowingTour(user.id, tour.id) : Promise.resolve(false),
    getTourProducts(tour.id),
  ]);

  const followerCount = tour.follower_count ?? 0;
  const ticketsSold = tour.tickets_sold ?? 0;
  const tourPassPrice = tour.tour_pass_price_cents ?? null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-widest text-primary">Digital tour</p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">{tour.title}</h1>
            {tour.tour_type ? (
              <Badge variant="secondary">{TOUR_TYPE_LABELS[tour.tour_type]}</Badge>
            ) : null}
          </div>
          <p className="mt-2 text-muted-foreground">
            {artist.stage_name} · {stops.length} {stops.length === 1 ? "stop" : "stops"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {followerCount.toLocaleString()} followers · {ticketsSold.toLocaleString()} tickets sold
          </p>
        </div>
        <FollowTourButton
          tourId={tour.id}
          artistSlug={slug}
          tourSlug={tourSlug}
          initialFollowing={following}
          disabled={!user}
        />
      </div>

      {tourPassPrice && tourPassPrice > 0 ? (
        <div className="glass-panel mt-8 flex flex-col gap-4 rounded-xl border border-primary/20 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Full tour pass</p>
            <p className="text-sm text-muted-foreground">
              Access every stop on this route with one purchase.
            </p>
          </div>
          <Button href={`/checkout?type=tour_pass&tour=${tour.id}`}>
            Tour pass · {formatCents(tourPassPrice)}
          </Button>
        </div>
      ) : null}

      {routeStops.length > 0 ? (
        <div className="mt-10 space-y-6">
          {globeStops.length > 0 ? (
            <TourGlobeMap stops={globeStops} showRoute autoRotate={false} />
          ) : null}
          <TourTimeline stops={routeStops} nextStopAt={nextStopRow?.scheduled_at ?? null} />
          <TourRouteMap tourName={tour.title} artistName={artist.stage_name} stops={routeStops} />
        </div>
      ) : null}

      {tourProducts.length > 0 ? (
        <section className="mt-14">
          <h2 className="text-xl font-semibold">Tour merchandise</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {tourProducts.map((product) => (
              <li key={product.id} className="glass-panel rounded-xl p-4">
                <p className="font-medium">{product.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{formatCents(product.price_cents)}</p>
                <Button
                  className="mt-4"
                  size="sm"
                  variant="secondary"
                  href={`/checkout?type=merch&product=${product.id}`}
                >
                  Buy merch
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <h2 className="mt-14 text-xl font-semibold">Tour stops</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Each stop is a city on the route — with its own arena, tickets, and live performance.
      </p>
      <ol className="mt-8 space-y-4">
        {stops.map((stop, i) => {
          const routeStop = routeStops[i];
          return (
            <li key={stop.id} className="glass-panel rounded-xl p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-primary">
                    Stop {i + 1}
                    {routeStop?.status === "live"
                      ? " · LIVE"
                      : routeStop?.status === "next"
                        ? " · Next"
                        : routeStop?.status === "completed"
                          ? " · Completed"
                          : ""}
                  </p>
                  <h3 className="text-xl font-semibold">
                    {stop.cities?.name ?? stop.virtual_location_label}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(stop.scheduled_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button href={`/checkout?tourStop=${stop.id}&type=ticket`}>
                    From {formatCents(stop.ticket_price_cents)}
                  </Button>
                  {stop.vip_price_cents && stop.vip_price_cents > 0 ? (
                    <Button
                      variant="outline"
                      href={`/checkout?tourStop=${stop.id}&type=ticket&tier=vip`}
                    >
                      VIP {formatCents(stop.vip_price_cents)}
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {nextStop ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Next city on the route: <span className="text-foreground">{nextStop.city}</span>
        </p>
      ) : null}
    </div>
  );
}
