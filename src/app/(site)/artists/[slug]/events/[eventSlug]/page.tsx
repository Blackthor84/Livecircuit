import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CheckoutSuccessBanner } from "@/components/checkout/checkout-success-banner";
import { LiveEventExperience } from "@/components/live/live-event-experience";
import { TourStopHero } from "@/components/touring/tour-stop-hero";
import { LocalCommunityCard } from "@/components/touring/tour-discovery-section";
import { Button } from "@/components/ui/button";
import { getLiveAccessForEvent } from "@/lib/actions/live-event";
import { getSessionUser } from "@/lib/auth/session";
import { getEventBySlug } from "@/lib/data/queries";
import { getViewerFeatureAccess } from "@/lib/features/guard";
import { formatCents } from "@/lib/format";
import { buildEventLobbyContent } from "@/lib/live/lobby";
import { parseStreamMetadata } from "@/lib/streaming/stream-metadata";
import { getVenueDisplayName } from "@/lib/venues/display-name";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { getEventSponsor } from "@/lib/sponsorship/inventory";
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
  const tourMeta = Array.isArray(event.tour_stops?.tours)
    ? event.tour_stops?.tours[0]
    : event.tour_stops?.tours;

  const access = await getLiveAccessForEvent(event.id, {
    status: event.status as string,
    scheduled_at: event.scheduled_at,
  });
  const [features, sessionUser, livestreamSponsor, replaySponsor] = await Promise.all([
    getViewerFeatureAccess(),
    getSessionUser(),
    getEventSponsor("livestream", event.id),
    getEventSponsor("replay", event.id),
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

  const tourCity = event.tour_city ?? event.tour_stops?.tour_city ?? "Virtual Stop";
  const tourStateName = event.tour_state_name ?? event.tour_stops?.tour_state_name ?? null;
  const tourStateCode = event.tour_state_code ?? event.tour_stops?.tour_state_code ?? null;
  const venueName = venueMeta ? getVenueDisplayName(venueMeta) : null;
  const tourStopId = event.tour_stops?.id ?? event.tour_stop_id ?? null;

  let community: { id: string; slug: string; member_count: number } | null = null;
  if (isSupabaseConfigured() && tourStopId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("tour_stop_communities")
      .select("id, slug, member_count")
      .eq("tour_stop_id", tourStopId)
      .maybeSingle();
    community = data;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <TourStopHero
        tourTitle={tourMeta?.title ?? event.title}
        tourCity={tourCity}
        tourStateName={tourStateName}
        tourStateCode={tourStateCode}
        showStartsAt={event.show_starts_at ?? event.scheduled_at}
        doorsOpenAt={event.doors_open_at ?? null}
        venueName={venueName}
        venueSlug={venueMeta?.slug ?? null}
        audienceMode={event.audience_mode ?? "worldwide"}
        isHomeCrowd={"isHomeCrowd" in access ? Boolean(access.isHomeCrowd) : false}
        className="mb-8"
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{event.artists?.stage_name}</p>
          {venueMeta ? (
            <p className="mt-1 text-sm">
              <Link
                href={`/livecircuit/venues/${venueMeta.slug}/concourse?event=${event.id}`}
                className="text-primary hover:underline"
              >
                Enter via {venueName} concourse
              </Link>
              {event.venue_room_label ? (
                <span className="text-muted-foreground"> · Room {event.venue_room_label}</span>
              ) : null}
            </p>
          ) : null}
          {access.mode === "denied" && access.message ? (
            <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              {access.message}
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

      {community ? (
        <div className="mb-6 max-w-sm">
          <LocalCommunityCard
            cityName={tourCity}
            stateCode={tourStateCode}
            memberCount={community.member_count}
            communitySlug={community.slug}
          />
        </div>
      ) : null}

      <LiveEventExperience
        eventId={event.id}
        title={event.title}
        initialStatus={event.status as EventStatus}
        initialAccess={access}
        lobby={lobby}
        checkoutHref={showTicketing ? `/checkout?event=${event.id}&type=ticket` : undefined}
        userSignedIn={Boolean(sessionUser)}
        tourCity={tourCity}
        livestreamSponsor={livestreamSponsor}
        replaySponsor={replaySponsor}
      />
    </div>
  );
}
