import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CheckoutSuccessBanner } from "@/components/checkout/checkout-success-banner";
import { LiveEventExperience } from "@/components/live/live-event-experience";
import { Button } from "@/components/ui/button";
import { getLiveAccessForEvent } from "@/lib/actions/live-event";
import { getSessionUser } from "@/lib/auth/session";
import { getEventBySlug } from "@/lib/data/queries";
import { getViewerFeatureAccess } from "@/lib/features/guard";
import { formatCents } from "@/lib/format";
import { buildEventLobbyContent } from "@/lib/live/lobby";
import { parseStreamMetadata } from "@/lib/streaming/stream-metadata";
import type { EventStatus } from "@/types/database";

type Props = { params: Promise<{ slug: string; eventSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, eventSlug } = await params;
  const event = await getEventBySlug(slug, eventSlug);
  return { title: event?.title ?? "Live event" };
}

export default async function LiveEventPage({ params }: Props) {
  const { slug, eventSlug } = await params;
  const event = await getEventBySlug(slug, eventSlug);
  if (!event) notFound();

  const price = event.tour_stops?.ticket_price_cents ?? 0;
  const vipPrice = event.tour_stops?.vip_price_cents;
  const venueMeta = Array.isArray(event.venues) ? event.venues[0] : event.venues;
  const access = await getLiveAccessForEvent(event.id, {
    status: event.status as string,
    scheduled_at: event.scheduled_at,
  });
  const [features, sessionUser] = await Promise.all([
    getViewerFeatureAccess(),
    getSessionUser(),
  ]);
  const showTicketing = features.canAccess("ticketing");

  const streams = Array.isArray(event.streams) ? event.streams[0] : event.streams;
  const lobby = buildEventLobbyContent({
    scheduledAt: event.scheduled_at,
    artistName: event.artists?.stage_name,
    locationLabel: event.tour_stops?.virtual_location_label,
    artistBannerUrl: event.artists?.banner_url,
    tourStopBannerUrl: event.tour_stops?.banner_url,
    metadata: parseStreamMetadata(streams?.metadata),
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <p className="text-muted-foreground">
            {event.artists?.stage_name} · {event.tour_stops?.virtual_location_label}
          </p>
          {venueMeta ? (
            <p className="mt-1 text-sm">
              <Link
                href={`/livecircuit/venues/${venueMeta.slug}/concourse?event=${event.id}`}
                className="text-primary hover:underline"
              >
                Enter via {venueMeta.name} concourse
              </Link>
              {event.venue_room_label ? (
                <span className="text-muted-foreground"> · Room {event.venue_room_label}</span>
              ) : null}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {showTicketing ? (
            <>
              <Button variant="secondary" href={`/checkout?type=tip&event=${event.id}&artist=${slug}`}>
                Tip artist
              </Button>
              <Button variant="outline" href={`/checkout?event=${event.id}&type=ticket`}>
                Tickets {formatCents(price)}
              </Button>
              {vipPrice && vipPrice > 0 ? (
                <Button variant="outline" href={`/checkout?event=${event.id}&type=ticket&tier=vip`}>
                  VIP {formatCents(vipPrice)}
                </Button>
              ) : null}
            </>
          ) : null}
          <Button href={`/artists/${slug}/merch`}>Merch</Button>
        </div>
      </div>

      <Suspense fallback={null}>
        <CheckoutSuccessBanner />
      </Suspense>

      <LiveEventExperience
        eventId={event.id}
        title={event.title}
        initialStatus={event.status as EventStatus}
        initialAccess={access}
        lobby={lobby}
        checkoutHref={showTicketing ? `/checkout?event=${event.id}&type=ticket` : undefined}
        userSignedIn={Boolean(sessionUser)}
      />
    </div>
  );
}
