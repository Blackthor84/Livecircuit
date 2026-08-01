import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Calendar,
  Globe2,
  MapPin,
  Mic2,
  Radio,
  Sparkles,
  Stamp,
  Star,
  Ticket,
  Users,
} from "lucide-react";
import { ArtistCard } from "@/components/artists/artist-card";
import { GlobalTourMap } from "@/components/home/global-tour-map";
import { LiveTourExperience } from "@/components/home/live-tour-experience";
import { TourRouteMap } from "@/components/home/tour-route-map";
import { ArtistFirstHomeSection } from "@/components/marketing/creator-promise-sections";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants";
import { FOUNDING_ARTIST_GOAL } from "@/lib/data/queries";
import { formatCents } from "@/lib/format";
import {
  DIGITAL_TOURING_BRAND,
  HOW_TOURING_WORKS,
  POPULAR_TOUR_CITIES,
  WHY_DIGITAL_TOURING,
} from "@/lib/home/digital-touring-content";
import {
  FOUNDING_ARTIST_BENEFITS,
  HOMEPAGE_CATEGORY_CARDS,
} from "@/lib/home/marketing-content";
import type { ArtistWithProfile } from "@/types/queries";
import type { ActiveTourCity, LiveTourSnapshot } from "@/lib/touring/tour-context";

type LiveEvent = {
  id: string;
  title: string;
  slug: string;
  scheduled_at: string;
  viewer_count?: number;
  artists?: { slug: string; stage_name: string; banner_url?: string | null } | null;
  tour_stops?: {
    virtual_location_label?: string;
    ticket_price_cents?: number;
    tour_city?: string | null;
    tours?: { title?: string; slug?: string } | null;
  } | null;
};

type Tour = {
  id: string;
  title: string;
  slug: string;
  artists?: { slug: string; stage_name: string } | null;
};

function EmptyPanel({
  icon: Icon,
  title,
  body,
  ctaLabel,
  ctaHref,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="glass-panel rounded-2xl border border-white/10 px-8 py-12 text-center">
      <Icon className="mx-auto size-10 text-primary/70" />
      <p className="mt-4 text-lg font-medium">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      <Button className="mt-6" href={ctaHref}>
        {ctaLabel}
      </Button>
    </div>
  );
}

export function MarketingHomepage({
  liveEvents,
  artists,
  tours,
  upcomingEvents,
  foundingArtistCount,
  showTicketing,
  liveTourSnapshots = [],
  activeMapCities = [],
}: {
  liveEvents: LiveEvent[];
  artists: ArtistWithProfile[];
  tours: Tour[];
  upcomingEvents: LiveEvent[];
  foundingArtistCount: number;
  showTicketing: boolean;
  liveTourSnapshots?: LiveTourSnapshot[];
  activeMapCities?: ActiveTourCity[];
}) {
  const heroSnapshot = liveTourSnapshots[0] ?? null;

  return (
    <div className="gradient-mesh">
      {heroSnapshot ? <LiveTourExperience snapshot={heroSnapshot} /> : null}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-primary">
              {DIGITAL_TOURING_BRAND.platformName}
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              <span className="text-gradient">{DIGITAL_TOURING_BRAND.heroHeadline}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              {DIGITAL_TOURING_BRAND.heroSubheadline}
            </p>
            <p className="mt-4 text-sm text-muted-foreground/80">{DIGITAL_TOURING_BRAND.streamingNote}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" href={`${ROUTES.register}?role=artist`}>
                {DIGITAL_TOURING_BRAND.primaryCta}
                <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="secondary" href={ROUTES.tours}>
                {DIGITAL_TOURING_BRAND.secondaryCta}
              </Button>
            </div>
          </div>
          {heroSnapshot ? (
            <TourRouteMap
              tourName={heroSnapshot.tourTitle}
              artistName={heroSnapshot.artistName}
              stops={heroSnapshot.routeStops}
            />
          ) : (
            <TourRouteMap />
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <Globe2 className="size-5 text-primary" />
            <h2 className="text-2xl font-semibold sm:text-3xl">Digital tours across the world</h2>
          </div>
          <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
            Artists travel digitally from city to city. Fans follow the route in real time — every stop is a real
            place with a real audience.
          </p>
        </div>
        <div className="mt-10">
          <GlobalTourMap cities={activeMapCities.length > 0 ? activeMapCities : undefined} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Radio className="size-5 text-red-400" />
              <h2 className="text-2xl font-semibold sm:text-3xl">Tours happening now</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Artists performing their current tour stop right now.</p>
          </div>
          <Link href={ROUTES.discover} className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-8">
          {liveEvents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {liveEvents.map((event) => {
                const tour = event.tour_stops?.tours;
                const city =
                  event.tour_stops?.tour_city ?? event.tour_stops?.virtual_location_label;
                return (
                <Card key={event.id} className="glass-panel border-red-500/20 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-red-400">Live tour stop</p>
                      {tour?.title ? (
                        <p className="text-xs text-primary">{tour.title}</p>
                      ) : null}
                      <p className="text-lg font-semibold">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.artists?.stage_name}
                        {city ? ` · ${city}` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      href={
                        tour?.slug
                          ? `/artists/${event.artists?.slug}/tours/${tour.slug}`
                          : `/artists/${event.artists?.slug}/events/${event.slug}`
                      }
                    >
                      Join stop
                    </Button>
                  </div>
                </Card>
              );
              })}
            </div>
          ) : (
            <EmptyPanel
              icon={Radio}
              title="No tours are live right now."
              body="Be the first artist to launch a digital tour on LiveCircuit."
              ctaLabel={DIGITAL_TOURING_BRAND.primaryCta}
              ctaHref={`${ROUTES.register}?role=artist`}
            />
          )}
        </div>
      </section>

      {tours.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold sm:text-3xl">Featured tours</h2>
              <p className="mt-1 text-sm text-muted-foreground">Multi-city digital tours from real artists.</p>
            </div>
            <Link href={ROUTES.tours} className="text-sm text-primary hover:underline">
              View all tours
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {tours.map((tour) => (
              <Card key={tour.id} className="glass-panel overflow-hidden border-white/10">
                <div className="h-32 bg-gradient-to-br from-primary/30 to-accent/20" />
                <CardHeader>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {tour.artists?.stage_name}
                  </p>
                  <CardTitle>{tour.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="secondary"
                    size="sm"
                    href={`/artists/${tour.artists?.slug}/tours/${tour.slug}`}
                  >
                    Follow tour
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold sm:text-3xl">Upcoming tour stops</h2>
            <p className="mt-1 text-sm text-muted-foreground">The next cities on artists&apos; digital routes.</p>
          </div>
        </div>
        <div className="mt-8">
          {upcomingEvents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingEvents.map((event) => (
                <Card
                  key={event.id}
                  className="glass-panel flex flex-col gap-2 border-white/10 p-6 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm text-primary">
                      {event.tour_stops?.virtual_location_label ?? "Tour stop"}
                    </p>
                    <p className="text-lg font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {event.artists?.stage_name} · {new Date(event.scheduled_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {showTicketing ? (
                      <>
                        <span className="text-sm font-medium">
                          {formatCents(event.tour_stops?.ticket_price_cents ?? 0)}
                        </span>
                        <Button size="sm" href={`/artists/${event.artists?.slug}/events/${event.slug}`}>
                          Get tickets
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" href={`/artists/${event.artists?.slug}/events/${event.slug}`}>
                        View stop
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyPanel
              icon={Calendar}
              title="Upcoming tour stops will appear here."
              body="When artists publish digital tours, every city on the route shows up here."
              ctaLabel={DIGITAL_TOURING_BRAND.primaryCta}
              ctaHref={`${ROUTES.register}?role=artist`}
            />
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold sm:text-3xl">Top touring artists</h2>
            <p className="mt-1 text-sm text-muted-foreground">Creators building multi-city digital tours.</p>
          </div>
          {artists.length > 0 ? (
            <Link href={ROUTES.artists} className="text-sm text-primary hover:underline">
              View all
            </Link>
          ) : null}
        </div>
        <div className="mt-8">
          {artists.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {artists.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </div>
          ) : (
            <EmptyPanel
              icon={Star}
              title="Top touring artists will appear here."
              body="Founding artists who launch digital tours first will be featured on the homepage."
              ctaLabel="Apply as a Founding Artist"
              ctaHref={`${ROUTES.register}?role=artist`}
            />
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="size-5 text-primary" />
              <h2 className="text-2xl font-semibold sm:text-3xl">Most visited cities</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Where digital tours stop most often.</p>
            <ul className="mt-6 space-y-3">
              {POPULAR_TOUR_CITIES.map((entry, index) => (
                <li
                  key={entry.city}
                  className="glass-panel flex items-center justify-between rounded-xl border border-white/10 px-4 py-3"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                    {entry.city}
                  </span>
                  <span className="text-sm text-muted-foreground">{entry.stops} tour stops</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Stamp className="size-5 text-primary" />
              <h2 className="text-2xl font-semibold sm:text-3xl">Your digital passport</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Collect a stamp for every city you attend. Complete state collections, country collections, and world
              tours.
            </p>
            <div className="glass-panel mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-6">
              <p className="text-sm font-medium uppercase tracking-wide text-primary">Fan experience</p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>Follow tours and get notified at each new city</li>
                <li>Track every city you&apos;ve attended</li>
                <li>Earn badges for states, countries, and world tours</li>
                <li>Join the next stop when your artist arrives</li>
              </ul>
              <Button className="mt-6" href={ROUTES.passport}>
                Open your passport
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold sm:text-3xl">Discover tours by category</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Music, comedy, podcasts, and more — every genre tours digitally on LiveCircuit.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {HOMEPAGE_CATEGORY_CARDS.map((cat) => (
            <Link
              key={cat.query}
              href={`${ROUTES.search}?q=${encodeURIComponent(cat.label)}`}
              className="glass-panel group rounded-xl border border-white/10 p-5 transition hover:border-primary/40 hover:bg-primary/5"
            >
              <span className="text-2xl">{cat.emoji}</span>
              <p className="mt-3 font-medium group-hover:text-primary">{cat.label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold sm:text-3xl">Why LiveCircuit</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          The world&apos;s first Digital Touring Platform — built for artists who tour, and fans who follow.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_DIGITAL_TOURING.map((feature) => (
            <Card key={feature.title} className="glass-panel border-white/10">
              <CardHeader>
                <CardTitle className="text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{feature.body}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-semibold sm:text-3xl">How digital touring works</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <Card className="glass-panel border-white/10">
            <CardHeader>
              <Users className="size-8 text-primary" />
              <CardTitle>Fans follow tours</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {HOW_TOURING_WORKS.fans.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card className="glass-panel border-white/10">
            <CardHeader>
              <Mic2 className="size-8 text-primary" />
              <CardTitle>Artists go on digital tours</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {HOW_TOURING_WORKS.artists.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <ArtistFirstHomeSection />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="glass-panel overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-transparent to-primary/10 p-8 sm:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-violet-300" />
                <p className="text-sm uppercase tracking-wide text-violet-300">Founding Artist Program</p>
              </div>
              <h2 className="mt-3 text-3xl font-bold">
                Launch the first digital tours on LiveCircuit
              </h2>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                We&apos;re looking for founding artists to shape the world&apos;s first Digital Touring Platform.
                Early access, featured placement, and a direct line to our team.
              </p>
              <ul className="mt-6 space-y-2 text-sm">
                {FOUNDING_ARTIST_BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2">
                    <Ticket className="mt-0.5 size-4 shrink-0 text-primary" />
                    {benefit}
                  </li>
                ))}
              </ul>
              <Button className="mt-8" size="lg" href={`${ROUTES.register}?role=artist`}>
                {DIGITAL_TOURING_BRAND.primaryCta}
              </Button>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 px-8 py-6 text-center">
              <p className="text-sm uppercase tracking-wide text-muted-foreground">Founding Artists</p>
              <p className="mt-2 text-4xl font-bold">
                {foundingArtistCount}{" "}
                <span className="text-lg font-normal text-muted-foreground">/ {FOUNDING_ARTIST_GOAL} Accepted</span>
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-primary transition-all"
                  style={{ width: `${Math.min(100, (foundingArtistCount / FOUNDING_ARTIST_GOAL) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-semibold">Tour stories from founding artists</h2>
        <p className="mt-4 text-muted-foreground">Our first digital tour stories will appear here.</p>
      </section>
    </div>
  );
}
