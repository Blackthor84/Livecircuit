import Link from "next/link";
import { ArrowRight, MapPin, Mic2, Ticket, Users } from "lucide-react";
import { AnimatedGlobe } from "@/components/landing/animated-globe";
import { ArtistCard } from "@/components/artists/artist-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TAGLINE, ROUTES } from "@/lib/constants";
import { getFeaturedArtists, getPublishedTours, getUpcomingEvents } from "@/lib/data/queries";
import { getPlatformHomepageSponsorBanner } from "@/lib/data/sponsors";
import { getHeaderUser } from "@/lib/auth/session";
import { getViewerFeatureAccess } from "@/lib/features/guard";
import { formatCents } from "@/lib/format";
import { VenueSponsorBanner } from "@/components/venues/venue-sponsor-banner";

const marketingFeatures = [
  {
    icon: MapPin,
    title: "Fan heat maps",
    body: "See where your audience lives by country, state, and city — plan virtual and real-world tours with confidence.",
  },
  {
    icon: Mic2,
    title: "Studio-grade live shows",
    body: "Stream from home with chat, reactions, song requests, and moderation built for performers.",
  },
  {
    icon: Ticket,
    title: "Tickets & VIP",
    body: "Sell tickets, backstage access, and merch with Stripe — all in one checkout flow.",
  },
  {
    icon: Users,
    title: "Tour stops as events",
    body: "Build multi-city virtual tours where each stop is its own countdown, banner, and live moment.",
  },
];

export default async function HomePage() {
  const [artists, tours, events, homepageSponsor, featureAccess, user] = await Promise.all([
    getFeaturedArtists(4),
    getPublishedTours(3),
    getUpcomingEvents(4),
    getPlatformHomepageSponsorBanner(),
    getViewerFeatureAccess(),
    getHeaderUser(),
  ]);

  const showWorld = featureAccess.canAccess("world_map");
  const showSponsor = featureAccess.canAccess("sponsorships");
  const showTicketing = featureAccess.canAccess("ticketing");

  return (
    <div className="gradient-mesh">
      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            Virtual touring platform
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="text-gradient">{APP_TAGLINE}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            LiveCircuit connects artists and fans worldwide — concerts, comedy, podcasts, DJ sets,
            and more — with actionable audience maps and ticketed live experiences.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" href={ROUTES.discover}>
              Find Artists
              <ArrowRight className="size-4" />
            </Button>
            {showWorld ? (
              <Button size="lg" variant="secondary" href={ROUTES.world}>
                Enter LiveCircuit World
              </Button>
            ) : null}
            {!user ? (
              <>
                <Button size="lg" variant="outline" href={ROUTES.register}>
                  Get Started
                </Button>
              </>
            ) : (
              <>
                <Button size="lg" variant="outline" href={ROUTES.profile}>
                  My Profile
                </Button>
                <Button size="lg" variant="secondary" href={ROUTES.dashboard}>
                  My Events
                </Button>
                {(user.role === "admin" || user.role === "super_admin") ? (
                  <Button size="lg" variant="secondary" href={ROUTES.admin}>
                    {user.role === "super_admin" ? "Command Center" : "Admin Dashboard"}
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </div>
        <AnimatedGlobe />
      </section>

      {homepageSponsor && showSponsor ? (
        <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
          <VenueSponsorBanner
            title={homepageSponsor.name}
            subtitle={homepageSponsor.organization_name ?? "LiveCircuit partner"}
            imageUrl={homepageSponsor.asset_url}
            href={homepageSponsor.click_url}
            advertisementId={homepageSponsor.advertisement_id}
            billboardId={homepageSponsor.billboard_id}
          />
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold sm:text-3xl">Built for the new tour economy</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {marketingFeatures
            .filter((f) => (f.title === "Tickets & VIP" ? showTicketing : true))
            .map((f) => (
            <Card key={f.title} className="glass-panel border-white/10">
              <CardHeader>
                <f.icon className="size-8 text-primary" />
                <CardTitle className="text-lg">{f.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{f.body}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold">Trending artists</h2>
          <Link href={ROUTES.artists} className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold">Upcoming tours</h2>
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
                <Button variant="secondary" size="sm" href={`/artists/${tour.artists?.slug}/tours/${tour.slug}`}>
                  View tour
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold">Next live stops</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <Card key={event.id} className="glass-panel flex flex-col gap-2 border-white/10 p-6 sm:flex-row sm:items-center sm:justify-between">
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
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-3xl font-semibold">How it works</h2>
        <ol className="mt-8 space-y-6 text-left text-muted-foreground">
          <li>
            <strong className="text-foreground">1. Fans map their city</strong> — registration
            powers heat maps artists use to route tours.
          </li>
          <li>
            <strong className="text-foreground">2. Artists publish tour stops</strong> — each stop
            becomes a ticketed live event with VIP and merch.
          </li>
          <li>
            <strong className="text-foreground">3. Everyone shows up live</strong> — stream, chat,
            tip, and celebrate encores from anywhere.
          </li>
        </ol>
      </section>
    </div>
  );
}
