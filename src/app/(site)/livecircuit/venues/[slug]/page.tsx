import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Award,
  Calendar,
  CloudSun,
  MapPin,
  Radio,
  Star,
  Trophy,
  Users,
  MessageSquare,
} from "lucide-react";
import { ArtistCard } from "@/components/artists/artist-card";
import { VenueCard } from "@/components/venues/venue-card";
import { VenueFollowButton } from "@/components/venues/venue-follow-button";
import { VenueSponsorBanner } from "@/components/venues/venue-sponsor-banner";
import {
  VenueThemeBadge,
  VenueThemeHeroOverlay,
  VenueThemeShell,
} from "@/components/venues/venue-theme-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { getVenueLandingPage, isFollowingVenue, listVenueEvents } from "@/lib/data/venues";
import { getActiveVenueTheme } from "@/lib/data/venue-themes";
import type { ArtistCategory } from "@/types/database";

type Props = { params: Promise<{ slug: string }> };

function displayVenueTitle(data: NonNullable<Awaited<ReturnType<typeof getVenueLandingPage>>>) {
  const naming = data.founding_sponsor?.display_name;
  return naming?.trim() || data.name;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const venue = await getVenueLandingPage(slug);
  if (!venue) return { title: "Venue" };
  const title = displayVenueTitle(venue);
  return {
    title,
    description: venue.description ?? `${title} on LiveCircuit`,
    openGraph: {
      images: venue.hero_image_url ? [venue.hero_image_url] : venue.banner_url ? [venue.banner_url] : [],
    },
  };
}

export default async function VenueLandingPage({ params }: Props) {
  const { slug } = await params;
  const [data, activeTheme] = await Promise.all([getVenueLandingPage(slug), getActiveVenueTheme(slug)]);
  if (!data) notFound();

  const allRooms = await listVenueEvents(slug, { status: "all", page: 1, limit: 48 });

  const user = await getSessionUser();
  const following = user ? await isFollowingVenue(user.id, data.id) : false;

  const hero =
    data.hero_image_url ??
    data.banner_url ??
    `https://picsum.photos/seed/venue-hero-${data.slug}/1920/800`;

  const title = displayVenueTitle(data);
  const sponsorLine =
    data.founding_sponsor?.sponsor_organizations?.name ??
    data.featured_sponsor?.name ??
    null;

  const themeClass = activeTheme ? `venue-theme-${activeTheme.classSuffix}` : "";

  return (
    <VenueThemeShell theme={activeTheme} venueSlug={data.slug} className={themeClass}>
      <div className="relative min-h-[280px] sm:min-h-[360px]">
        <Image src={hero} alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-primary/20" />
        <VenueThemeHeroOverlay />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_55%)]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="-mt-20 relative space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              {activeTheme ? (
                <span className="mb-2 inline-block">
                  <VenueThemeBadge theme={activeTheme} />
                </span>
              ) : data.active_theme ? (
                <Badge variant="secondary" className="mb-2">
                  {data.active_theme.name}
                </Badge>
              ) : null}
              {data.founding_sponsor ? (
                <Badge className="mb-2 ml-2 gap-1">
                  <Award className="size-3.5" />
                  Founding Sponsor: {data.founding_sponsor.sponsor_organizations?.name ?? "Partner"}
                </Badge>
              ) : null}
              <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{title}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-muted-foreground">
                <span className="inline-flex items-center gap-1 capitalize">
                  <MapPin className="size-4" />
                  {data.region}
                  {data.state_code ? `, ${data.state_code}` : ""}
                </span>
                <span>·</span>
                <span>{data.venue_types?.name ?? "Venue"}</span>
              </p>
              {sponsorLine ? (
                <p className="mt-1 text-sm text-primary/90">Featured partner · {sponsorLine}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <VenueFollowButton venueId={data.id} initialFollowing={following} disabled={!user} />
              <Button variant="secondary" href={`/livecircuit/venues/${data.slug}/concourse`}>
                Digital concourse
              </Button>
              <Button variant="outline" href={`/livecircuit/venues/${data.slug}/hall-of-fame`}>
                Hall of Fame
              </Button>
              <Button variant="outline" href={`/livecircuit/venues/${data.slug}/tv`}>
                Venue TV
              </Button>
              <Button variant="outline" href={`/livecircuit/venues/${data.slug}/local`}>
                Local businesses
              </Button>
              <Button variant="outline" href={`/livecircuit/venues/${data.slug}/community`}>
                Community
              </Button>
              <Button variant="outline" href={`/livecircuit/venues/${data.slug}/loyalty`}>
                Loyalty
              </Button>
            </div>
          </div>

          {(data.sponsor_banner || sponsorLine) && (
            <div className="pt-4">
              <VenueSponsorBanner
                title={data.sponsor_banner?.name ?? sponsorLine ?? "LiveCircuit Partner"}
                subtitle={data.sponsor_banner?.organization_name ?? "Official venue partner"}
                imageUrl={data.sponsor_banner?.asset_url}
                href={data.sponsor_banner?.click_url}
                advertisementId={data.sponsor_banner?.advertisement_id}
                billboardId={data.sponsor_banner?.billboard_id}
                venueId={data.id}
              />
            </div>
          )}

          <div className="grid gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Capacity", value: data.capacity.toLocaleString(), icon: Users },
              {
                label: "Followers",
                value: data.follower_count.toLocaleString(),
                icon: Users,
              },
              {
                label: "In venue now",
                value: data.current_visitors.toLocaleString(),
                icon: Radio,
              },
              {
                label: "Live performances",
                value: String(allRooms?.liveCount ?? data.live_events.length),
                icon: Radio,
              },
              {
                label: "Reviews",
                value:
                  data.review_summary.count > 0
                    ? `${data.review_summary.average.toFixed(1)} ★ (${data.review_summary.count})`
                    : "New venue",
                icon: Star,
              },
            ].map((stat) => (
              <div key={stat.label} className="glass-panel rounded-xl p-4">
                <stat.icon className="size-5 text-primary" />
                <p className="mt-2 text-2xl font-semibold tabular-nums">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {allRooms && allRooms.total > 0 ? (
          <section className="mt-14" id="simultaneous-rooms">
            <h2 className="text-xl font-semibold">
              Simultaneous rooms ({allRooms.total})
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Each performance runs in its own room with separate chat, tickets, and analytics.
            </p>
            <div className="mt-6 space-y-3">
              {allRooms.items.map((event) => (
                <EventRow key={event.id} event={event} live={event.status === "live"} />
              ))}
            </div>
            {allRooms.hasMore ? (
              <p className="mt-4 text-sm text-muted-foreground">
                More rooms available via{" "}
                <code className="text-xs">/api/venues/{data.slug}/events</code>
              </p>
            ) : null}
          </section>
        ) : null}

        {data.live_events.length > 0 ? (
          <section className="mt-14">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-red-500" />
              </span>
              Live now
            </h2>
            <div className="mt-6 space-y-3">
              {data.live_events.map((event) => (
                <EventRow key={event.id} event={event} live />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-14">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Calendar className="size-5 text-primary" />
            Upcoming shows
          </h2>
          <div className="mt-6 space-y-3">
            {data.upcoming_events.length ? (
              data.upcoming_events.map((event) => <EventRow key={event.id} event={event} />)
            ) : (
              <p className="text-muted-foreground">No upcoming shows scheduled — follow for alerts.</p>
            )}
          </div>
        </section>

        {data.featured_artists.length > 0 ? (
          <section className="mt-14">
            <h2 className="text-xl font-semibold">Popular artists at this venue</h2>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {data.featured_artists.map((row) =>
                row.artists ? (
                  <ArtistCard
                    key={row.artists.id}
                    artist={{
                      slug: row.artists.slug,
                      stage_name: row.artists.stage_name,
                      banner_url: row.artists.banner_url,
                      category: row.artists.category as ArtistCategory,
                      verified: row.artists.verified,
                      follower_count: row.artists.follower_count,
                    }}
                  />
                ) : null
              )}
            </div>
          </section>
        ) : null}

        <section className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <MessageSquare className="size-5 text-primary" />
              Community
            </h2>
            <Button variant="secondary" size="sm" href={`/livecircuit/venues/${data.slug}/community`}>
              Open community hub
            </Button>
          </div>
          {data.community_posts.length ? (
            <ul className="mt-6 space-y-3">
              {data.community_posts.map((post) => (
                <li key={post.id} className="glass-panel rounded-xl p-4 text-sm">
                  {post.is_pinned ? (
                    <Badge variant="secondary" className="mb-2">
                      Pinned
                    </Badge>
                  ) : null}
                  {post.title ? <p className="font-medium">{post.title}</p> : null}
                  <p className="mt-1 line-clamp-2 text-muted-foreground">{post.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {post.profiles?.display_name ?? "Fan"} ·{" "}
                    {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Be the first to post — follow the venue and join discussions, reviews, and local rankings.
            </p>
          )}
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-2">
          <div className="glass-panel rounded-xl p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Trophy className="size-5 text-primary" />
              Local leaderboard
            </h2>
            {data.leaderboard?.payload?.length ? (
              <ul className="mt-4 space-y-2 text-sm">
                {(data.leaderboard.payload as { name?: string; score?: number }[]).slice(0, 5).map((row, i) => (
                  <li key={i} className="flex justify-between border-b border-white/5 py-2">
                    <span>{row.name ?? `Rank #${i + 1}`}</span>
                    <span className="tabular-nums text-muted-foreground">{row.score ?? "—"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Rankings update as fans attend shows, tip artists, and join the community.
              </p>
            )}
          </div>
          <div className="glass-panel rounded-xl p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <CloudSun className="size-5 text-primary" />
              Weather-ready
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">
              {typeof data.weather_placeholder?.summary === "string"
                ? data.weather_placeholder.summary
                : "Placeholder for future hybrid events — local forecast and travel tips for in-person add-ons."}
            </p>
          </div>
        </section>

        {data.recent_reviews.length > 0 ? (
          <section className="mt-14">
            <h2 className="text-xl font-semibold">Venue reviews</h2>
            <ul className="mt-6 space-y-3">
              {data.recent_reviews.slice(0, 5).map((review) => (
                <li key={review.id} className="glass-panel rounded-xl p-4 text-sm">
                  <p className="font-medium">
                    {"★".repeat(review.rating)}
                    <span className="ml-2 text-muted-foreground">
                      {review.profiles?.display_name ?? "Fan"}
                    </span>
                  </p>
                  {review.body ? <p className="mt-2 text-muted-foreground">{review.body}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {data.past_events.length > 0 ? (
          <section className="mt-14">
            <h2 className="text-xl font-semibold">Trending performances (recent)</h2>
            <div className="mt-6 space-y-3">
              {data.past_events.map((event) => (
                <EventRow key={event.id} event={event} past />
              ))}
            </div>
          </section>
        ) : null}

        {data.nearby_venues.length > 0 ? (
          <section className="mt-14 pb-16">
            <h2 className="text-xl font-semibold">Nearby regions</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {data.nearby_venues.map((v) => (
                <VenueCard key={v.id} venue={v} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-14 scroll-mt-24 pb-8">
          <div className="glass-panel rounded-2xl border border-primary/20 p-8 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <h2 className="text-xl font-semibold">Enter through the concourse</h2>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                Merch, food sponsors, photo booths, and show boards — then step into your room.
              </p>
            </div>
            <Button className="mt-4 sm:mt-0" href={`/livecircuit/venues/${data.slug}/concourse`}>
              Open digital concourse
            </Button>
          </div>
        </section>
      </div>
    </VenueThemeShell>
  );
}

function EventRow({
  event,
  live,
  past,
}: {
  event: {
    id: string;
    slug: string;
    title: string;
    scheduled_at: string;
    viewer_count?: number;
    venue_room_label?: string | null;
    artists: { slug: string; stage_name: string } | null;
  };
  live?: boolean;
  past?: boolean;
}) {
  const artistSlug = event.artists?.slug;
  const href = artistSlug ? `/artists/${artistSlug}/events/${event.slug}` : "#";

  return (
    <div className="glass-panel flex flex-col justify-between gap-4 rounded-xl p-4 sm:flex-row sm:items-center">
      <div>
        <p className="font-medium">{event.title}</p>
        <p className="text-sm text-muted-foreground">
          {event.artists?.stage_name ?? "Artist"} ·{" "}
          {event.venue_room_label ? `Room ${event.venue_room_label} · ` : ""}
          {new Date(event.scheduled_at).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
          {live && event.viewer_count != null ? ` · ${event.viewer_count.toLocaleString()} watching` : ""}
        </p>
      </div>
      <Button size="sm" href={href} disabled={!artistSlug}>
        {past ? "Replay info" : live ? "Join live" : "Get tickets"}
      </Button>
    </div>
  );
}
