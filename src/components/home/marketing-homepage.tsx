import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Building2,
  Calendar,
  Flame,
  MapPin,
  Mic2,
  Radio,
  Sparkles,
  Star,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";
import { ArtistCard } from "@/components/artists/artist-card";
import { DigitalTouringHero } from "@/components/home/digital-touring-hero";
import { LiveTourExperience } from "@/components/home/live-tour-experience";
import { PassportStampPreview } from "@/components/home/passport-stamp-preview";
import {
  ArtistFirstHomeSection,
  FreeToJoinHomeSection,
} from "@/components/marketing/creator-promise-sections";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants";
import { FOUNDING_ARTIST_GOAL } from "@/lib/data/queries";
import { formatCents } from "@/lib/format";
import { HOW_TOURING_WORKS, WHY_DIGITAL_TOURING } from "@/lib/home/digital-touring-content";
import { HOMEPAGE_EMPTY_STATES, FOUNDING_ARTIST_BENEFITS } from "@/lib/home/empty-states";
import { HOMEPAGE_CATEGORY_CARDS } from "@/lib/home/marketing-content";
import type { HomepageTouringPayload, HomepageTourSection } from "@/lib/touring/homepage-data";
import type { ArtistWithProfile } from "@/types/queries";
import type { LiveTourSnapshot } from "@/lib/touring/tour-context";

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

function TourCardGrid({
  tours,
  emptyIcon: Icon,
  emptyTitle,
  emptyBody,
  ctaLabel,
  ctaHref,
}: {
  tours: HomepageTourSection[];
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyBody: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  if (!tours.length) {
    return (
      <EmptyPanel
        icon={Icon}
        title={emptyTitle}
        body={emptyBody}
        ctaLabel={ctaLabel ?? "Explore tours"}
        ctaHref={ctaHref ?? ROUTES.tours}
      />
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tours.map((tour) => (
        <Card key={tour.id} className="glass-panel overflow-hidden border-white/10">
          <div className="h-24 bg-gradient-to-br from-primary/30 to-violet-500/20" />
          <CardHeader className="pb-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{tour.artistName}</p>
            <CardTitle className="text-lg">{tour.title}</CardTitle>
            {tour.city ? <p className="text-sm text-primary">{tour.city}</p> : null}
            {tour.startsAt ? (
              <p className="text-xs text-muted-foreground">{new Date(tour.startsAt).toLocaleDateString()}</p>
            ) : null}
          </CardHeader>
          <CardContent>
            <Button
              variant="secondary"
              size="sm"
              href={`/artists/${tour.artistSlug}/tours/${tour.slug}`}
            >
              Follow tour
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function MarketingHomepage({
  liveEvents,
  artists,
  upcomingEvents,
  foundingArtistCount,
  showTicketing,
  liveTourSnapshots = [],
  touring,
  venueFees,
}: {
  liveEvents: LiveEvent[];
  artists: ArtistWithProfile[];
  upcomingEvents: LiveEvent[];
  foundingArtistCount: number;
  showTicketing: boolean;
  liveTourSnapshots?: LiveTourSnapshot[];
  touring: HomepageTouringPayload;
  venueFees?: readonly { tier: string; fee: string }[];
}) {
  const heroSnapshot = liveTourSnapshots[0] ?? null;

  return (
    <div className="gradient-mesh">
      <DigitalTouringHero
        stats={touring.stats}
        activityFeed={touring.activityFeed}
        heatPoints={touring.heatPoints}
        heroGlobeStops={touring.heroGlobeStops}
        showHeroRoute={touring.showHeroRoute}
        hasLiveActivity={touring.hasLiveActivity}
      />

      {heroSnapshot ? <LiveTourExperience snapshot={heroSnapshot} /> : null}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeader icon={Radio} title="Live tours happening now" subtitle="Artists performing their current tour stop." href={ROUTES.discover} />
        <div className="mt-8">
          {touring.liveTours.length > 0 || liveEvents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {(touring.liveTours.length ? touring.liveTours : liveEvents.map((e) => ({
                id: e.id,
                title: e.title,
                slug: e.slug,
                artistName: e.artists?.stage_name ?? "Artist",
                artistSlug: e.artists?.slug ?? "",
                city: e.tour_stops?.tour_city ?? e.tour_stops?.virtual_location_label,
              }))).map((tour) => (
                <Card key={tour.id} className="glass-panel border-red-500/20 p-6">
                  <p className="text-xs uppercase tracking-wide text-red-400">Live tour stop</p>
                  <p className="text-lg font-semibold">{tour.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {tour.artistName}
                    {tour.city ? ` · ${tour.city}` : ""}
                  </p>
                  <Button className="mt-4" size="sm" href={`/artists/${tour.artistSlug}/events/${tour.slug}`}>
                    Join stop
                  </Button>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyPanel
              icon={Radio}
              title={HOMEPAGE_EMPTY_STATES.liveTours.title}
              body={HOMEPAGE_EMPTY_STATES.liveTours.body}
              ctaLabel={HOMEPAGE_EMPTY_STATES.liveTours.ctaLabel}
              ctaHref={HOMEPAGE_EMPTY_STATES.liveTours.ctaHref}
            />
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeader icon={Calendar} title="Tours starting soon" subtitle="Upcoming routes about to depart." href={ROUTES.tours} />
        <div className="mt-8">
          <TourCardGrid
            tours={touring.toursStartingSoon}
            emptyIcon={Calendar}
            emptyTitle={HOMEPAGE_EMPTY_STATES.toursStartingSoon.title}
            emptyBody={HOMEPAGE_EMPTY_STATES.toursStartingSoon.body}
            ctaLabel={HOMEPAGE_EMPTY_STATES.toursStartingSoon.ctaLabel}
            ctaHref={HOMEPAGE_EMPTY_STATES.toursStartingSoon.ctaHref}
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeader icon={TrendingUp} title="Trending tours" subtitle="Routes gaining momentum across the platform." href={ROUTES.tours} />
        <div className="mt-8">
          <TourCardGrid
            tours={touring.trendingTours}
            emptyIcon={Flame}
            emptyTitle={HOMEPAGE_EMPTY_STATES.trendingTours.title}
            emptyBody={HOMEPAGE_EMPTY_STATES.trendingTours.body}
            ctaLabel={HOMEPAGE_EMPTY_STATES.trendingTours.ctaLabel}
            ctaHref={HOMEPAGE_EMPTY_STATES.trendingTours.ctaHref}
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeader icon={Users} title="Most followed tours" subtitle="The routes fans are tracking most closely." href={ROUTES.tours} />
        <div className="mt-8">
          <TourCardGrid
            tours={touring.mostFollowedTours}
            emptyIcon={Users}
            emptyTitle={HOMEPAGE_EMPTY_STATES.mostFollowed.title}
            emptyBody={HOMEPAGE_EMPTY_STATES.mostFollowed.body}
            ctaLabel={HOMEPAGE_EMPTY_STATES.mostFollowed.ctaLabel}
            ctaHref={HOMEPAGE_EMPTY_STATES.mostFollowed.ctaHref}
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeader icon={Star} title="Featured artists" subtitle="Creators building multi-city digital tours." href={ROUTES.artists} />
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
              title={HOMEPAGE_EMPTY_STATES.featuredArtists.title}
              body={HOMEPAGE_EMPTY_STATES.featuredArtists.body}
              ctaLabel={HOMEPAGE_EMPTY_STATES.featuredArtists.ctaLabel}
              ctaHref={HOMEPAGE_EMPTY_STATES.featuredArtists.ctaHref}
            />
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <SectionHeader icon={MapPin} title="Most visited cities" subtitle="Where digital tours stop most often." />
            {touring.popularCities.length > 0 ? (
              <ul className="mt-6 space-y-3">
                {touring.popularCities.map((entry, index) => (
                  <li key={entry.city} className="glass-panel flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
                    <span className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                      {entry.city}
                    </span>
                    <span className="text-sm text-muted-foreground">{entry.stops} tour stops</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyPanel
                icon={MapPin}
                title={HOMEPAGE_EMPTY_STATES.popularCities.title}
                body={HOMEPAGE_EMPTY_STATES.popularCities.body}
                ctaLabel="Start Your Tour"
                ctaHref={`${ROUTES.register}?role=artist`}
              />
            )}
          </div>
          <div>
            <SectionHeader icon={Building2} title="Popular arenas" subtitle="Virtual venues hosting tour stops." href="/livecircuit/venues" />
            <ul className="mt-6 space-y-3">
              {touring.popularArenas.length > 0 ? (
                touring.popularArenas.map((arena) => (
                  <li key={arena.slug} className="glass-panel rounded-xl border border-white/10 px-4 py-3">
                    <Link href={`/livecircuit/venues/${arena.slug}`} className="font-medium hover:text-primary">
                      {arena.name}
                    </Link>
                  </li>
                ))
              ) : (
                <li className="glass-panel rounded-xl border border-white/10 px-4 py-6 text-center text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{HOMEPAGE_EMPTY_STATES.popularArenas.title}</p>
                  <p className="mt-1">{HOMEPAGE_EMPTY_STATES.popularArenas.body}</p>
                </li>
              )}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeader icon={Calendar} title="Recently completed tours" subtitle="Routes that finished their final stop." href={ROUTES.tours} />
        <div className="mt-8">
          <TourCardGrid
            tours={touring.completedTours}
            emptyIcon={Calendar}
            emptyTitle={HOMEPAGE_EMPTY_STATES.completedTours.title}
            emptyBody={HOMEPAGE_EMPTY_STATES.completedTours.body}
            ctaLabel={HOMEPAGE_EMPTY_STATES.completedTours.ctaLabel}
            ctaHref={HOMEPAGE_EMPTY_STATES.completedTours.ctaHref}
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeader icon={Calendar} title="Upcoming tour stops" subtitle="The next cities on artists' digital routes." />
        <div className="mt-8">
          {upcomingEvents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingEvents.map((event) => (
                <Card key={event.id} className="glass-panel flex flex-col gap-2 border-white/10 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-primary">{event.tour_stops?.virtual_location_label ?? "Tour stop"}</p>
                    <p className="text-lg font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {event.artists?.stage_name} · {new Date(event.scheduled_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {showTicketing ? (
                      <>
                        <span className="text-sm font-medium">{formatCents(event.tour_stops?.ticket_price_cents ?? 0)}</span>
                        <Button size="sm" href={`/artists/${event.artists?.slug}/events/${event.slug}`}>Get tickets</Button>
                      </>
                    ) : (
                      <Button size="sm" href={`/artists/${event.artists?.slug}/events/${event.slug}`}>View stop</Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyPanel
              icon={Calendar}
              title={HOMEPAGE_EMPTY_STATES.upcomingStops.title}
              body={HOMEPAGE_EMPTY_STATES.upcomingStops.body}
              ctaLabel={HOMEPAGE_EMPTY_STATES.upcomingStops.ctaLabel}
              ctaHref={HOMEPAGE_EMPTY_STATES.upcomingStops.ctaHref}
            />
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <PassportStampPreview stamps={touring.passportStamps} />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold sm:text-3xl">Discover tours by category</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">Music, comedy, podcasts, and more — every genre tours digitally.</p>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {HOMEPAGE_CATEGORY_CARDS.map((cat) => (
            <Link key={cat.query} href={`${ROUTES.search}?q=${encodeURIComponent(cat.label)}`} className="glass-panel group rounded-xl border border-white/10 p-5 transition hover:border-primary/40 hover:bg-primary/5">
              <span className="text-2xl">{cat.emoji}</span>
              <p className="mt-3 font-medium group-hover:text-primary">{cat.label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold sm:text-3xl">Why LiveCircuit</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">Artists perform digital tours. Fans follow the route in real time.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_DIGITAL_TOURING.map((feature) => (
            <Card key={feature.title} className="glass-panel border-white/10">
              <CardHeader><CardTitle className="text-base">{feature.title}</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">{feature.body}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-semibold sm:text-3xl">How digital touring works</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <Card className="glass-panel border-white/10">
            <CardHeader><Users className="size-8 text-primary" /><CardTitle>Fans follow tours</CardTitle></CardHeader>
            <CardContent><ul className="space-y-2 text-sm text-muted-foreground">{HOW_TOURING_WORKS.fans.map((item) => <li key={item}>{item}</li>)}</ul></CardContent>
          </Card>
          <Card className="glass-panel border-white/10">
            <CardHeader><Mic2 className="size-8 text-primary" /><CardTitle>Artists go on digital tours</CardTitle></CardHeader>
            <CardContent><ul className="space-y-2 text-sm text-muted-foreground">{HOW_TOURING_WORKS.artists.map((item) => <li key={item}>{item}</li>)}</ul></CardContent>
          </Card>
        </div>
      </section>

      <FreeToJoinHomeSection venueFees={venueFees} />
      <ArtistFirstHomeSection />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="glass-panel overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-transparent to-primary/10 p-8 sm:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-violet-300" />
                <p className="text-sm uppercase tracking-wide text-violet-300">Founding Artist Program</p>
              </div>
              <h2 className="mt-3 text-3xl font-bold">Be among the first artists on LiveCircuit</h2>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                The Founding Artist program celebrates early adopters who launch the platform&apos;s first digital
                tours. Priority placement, featured search, and recognition from day one.
              </p>
              <ul className="mt-6 space-y-2 text-sm">
                {FOUNDING_ARTIST_BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2">
                    <Ticket className="mt-0.5 size-4 shrink-0 text-primary" />
                    {benefit}
                  </li>
                ))}
              </ul>
              <Button className="mt-8" size="lg" href={`${ROUTES.register}?role=artist`}>Start Your Tour</Button>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 px-8 py-6 text-center">
              <p className="text-sm uppercase tracking-wide text-muted-foreground">Founding Artists</p>
              <p className="mt-2 text-4xl font-bold">
                {foundingArtistCount}{" "}
                <span className="text-lg font-normal text-muted-foreground">/ {FOUNDING_ARTIST_GOAL} Accepted</span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  href,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  href?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <Icon className="size-5 text-primary" />
          <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {href ? (
        <Link href={href} className="text-sm text-primary hover:underline">
          View all
          <ArrowRight className="ml-1 inline size-3.5" />
        </Link>
      ) : null}
    </div>
  );
}
