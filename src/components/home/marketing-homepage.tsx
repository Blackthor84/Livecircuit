import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Calendar,
  Mic2,
  Radio,
  Sparkles,
  Star,
  Ticket,
  Users,
} from "lucide-react";
import { ArtistCard } from "@/components/artists/artist-card";
import { AnimatedGlobe } from "@/components/landing/animated-globe";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants";
import { FOUNDING_ARTIST_GOAL } from "@/lib/data/queries";
import { formatCents } from "@/lib/format";
import {
  FOUNDING_ARTIST_BENEFITS,
  HOMEPAGE_CATEGORY_CARDS,
  WHY_LIVECIRCUIT_FEATURES,
} from "@/lib/home/marketing-content";
import type { ArtistWithProfile } from "@/types/queries";

type LiveEvent = {
  id: string;
  title: string;
  slug: string;
  scheduled_at: string;
  viewer_count?: number;
  artists?: { slug: string; stage_name: string; banner_url?: string | null } | null;
  tour_stops?: { virtual_location_label?: string; ticket_price_cents?: number } | null;
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
}: {
  liveEvents: LiveEvent[];
  artists: ArtistWithProfile[];
  tours: Tour[];
  upcomingEvents: LiveEvent[];
  foundingArtistCount: number;
  showTicketing: boolean;
}) {
  return (
    <div className="gradient-mesh">
      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            The future of live entertainment
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="text-gradient">The Future of Live Entertainment.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Watch concerts, comedy shows, podcasts, speakers, creators, and exclusive performances
            from anywhere in the world.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" href={`${ROUTES.register}?role=artist`}>
              Become a Founding Artist
              <ArrowRight className="size-4" />
            </Button>
            <Button size="lg" variant="secondary" href={ROUTES.discover}>
              Explore LiveCircuit
            </Button>
            <Button size="lg" variant="outline" href={ROUTES.register}>
              Sign Up Free
            </Button>
          </div>
        </div>
        <AnimatedGlobe />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Radio className="size-5 text-red-400" />
              <h2 className="text-2xl font-semibold sm:text-3xl">Live now</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Real performances happening right now.</p>
          </div>
        </div>
        <div className="mt-8">
          {liveEvents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {liveEvents.map((event) => (
                <Card key={event.id} className="glass-panel border-red-500/20 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-red-400">Live</p>
                      <p className="text-lg font-semibold">{event.title}</p>
                      <p className="text-sm text-muted-foreground">{event.artists?.stage_name}</p>
                    </div>
                    <Button
                      size="sm"
                      href={`/artists/${event.artists?.slug}/events/${event.slug}`}
                    >
                      Watch
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyPanel
              icon={Radio}
              title="No artists are live right now."
              body="Be one of the first artists to perform on LiveCircuit."
              ctaLabel="Go Live on LiveCircuit"
              ctaHref={`${ROUTES.register}?role=artist`}
            />
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold sm:text-3xl">Featured artists</h2>
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
              title="Our Founding Artists will appear here soon."
              body="Verified creators who join LiveCircuit first will be featured on the homepage."
              ctaLabel="Apply as a Founding Artist"
              ctaHref={`${ROUTES.register}?role=artist`}
            />
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold sm:text-3xl">Upcoming events</h2>
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
                    <p className="text-sm text-muted-foreground">
                      {event.tour_stops?.virtual_location_label}
                    </p>
                    <p className="text-lg font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.scheduled_at).toLocaleString()}
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
                        View event
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyPanel
              icon={Calendar}
              title="Upcoming performances will appear here."
              body="When real artists publish shows, you'll find ticketed events on this page."
              ctaLabel="Become a Founding Artist"
              ctaHref={`${ROUTES.register}?role=artist`}
            />
          )}
        </div>
      </section>

      {tours.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold sm:text-3xl">Popular tours</h2>
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
                    View tour
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold sm:text-3xl">Discover by category</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Explore live entertainment across every genre — from stadium concerts to intimate podcast sessions.
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
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {WHY_LIVECIRCUIT_FEATURES.map((feature) => (
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
        <h2 className="text-center text-2xl font-semibold sm:text-3xl">How it works</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <Card className="glass-panel border-white/10">
            <CardHeader>
              <Users className="size-8 text-primary" />
              <CardTitle>Fans</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Discover creators across music, comedy, podcasts, and more</li>
                <li>Buy tickets and watch live from anywhere</li>
                <li>Chat, react, and support artists in real time</li>
                <li>Collect Tour Passport stamps at every show</li>
                <li>Tip, subscribe, and join exclusive communities</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="glass-panel border-white/10">
            <CardHeader>
              <Mic2 className="size-8 text-primary" />
              <CardTitle>Artists</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Create events and sell tickets with secure checkout</li>
                <li>Go live with Green Room prep and Producer Mode</li>
                <li>Build subscribers and earn revenue from every show</li>
                <li>Manage multi-city virtual tours from one dashboard</li>
                <li>View analytics, fan heat maps, and performance data</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="glass-panel overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-transparent to-primary/10 p-8 sm:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-violet-300" />
                <p className="text-sm uppercase tracking-wide text-violet-300">Founding Artist Program</p>
              </div>
              <h2 className="mt-3 text-3xl font-bold">
                Become One of LiveCircuit&apos;s Founding Artists
              </h2>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                We&apos;re looking for our first creators to help shape the future of live entertainment.
                Founding artists receive early access, featured placement, and a direct line to our team.
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
                Apply Now
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
        <h2 className="text-2xl font-semibold">Founder testimonials</h2>
        <p className="mt-4 text-muted-foreground">Our first creator stories will appear here.</p>
      </section>
    </div>
  );
}
