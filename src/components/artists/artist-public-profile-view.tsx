import Image from "next/image";
import {
  BadgeCheck,
  Calendar,
  Clock,
  Eye,
  Globe,
  Mail,
  MapPin,
  Music2,
  Play,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EventCountdown } from "@/components/artists/event-countdown";
import { FollowButton } from "@/components/artists/follow-button";
import { MessageArtistButton } from "@/components/messages/message-artist-button";
import { ShareProfileButton } from "@/components/artists/share-profile-button";
import { ARTIST_CATEGORIES } from "@/lib/constants";
import { formatCents } from "@/lib/format";
import {
  getCategoryLabel,
  type ArtistPublicProfile,
} from "@/lib/data/artist-public-profile";

const SOCIAL_CONFIG = [
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
  { key: "facebook", label: "Facebook" },
  { key: "twitter", label: "X" },
  { key: "spotify", label: "Spotify" },
  { key: "apple_music", label: "Apple Music" },
  { key: "website", label: "Website" },
] as const;

function socialHref(key: string, value: string): string {
  if (value.startsWith("http")) return value;
  const handles: Record<string, (v: string) => string> = {
    instagram: (v) => `https://instagram.com/${v.replace(/^@/, "")}`,
    tiktok: (v) => `https://tiktok.com/@${v.replace(/^@/, "")}`,
    youtube: (v) => (v.startsWith("@") ? `https://youtube.com/${v}` : `https://youtube.com/@${v}`),
    facebook: (v) => `https://facebook.com/${v}`,
    twitter: (v) => `https://x.com/${v.replace(/^@/, "")}`,
    spotify: (v) => v,
    apple_music: (v) => v,
    website: (v) => v,
  };
  return handles[key]?.(value) ?? value;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass-panel rounded-xl p-4 text-center">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{children}</h2>;
}

export function ArtistPublicProfileView({
  profile,
  following,
  isOwner,
  showMessages,
  username,
}: {
  profile: ArtistPublicProfile;
  following: boolean;
  isOwner: boolean;
  showMessages: boolean;
  username: string;
}) {
  const { artist, stats, genres, upcomingEvents, pastEvents, liveEvent, featuredVideos, reviews, products } =
    profile;

  const banner =
    artist.banner_url ?? `https://picsum.photos/seed/${artist.slug}-banner/1600/500`;
  const avatar =
    artist.profiles?.avatar_url ?? `https://picsum.photos/seed/${artist.slug}-avatar/400/400`;
  const categoryLabel =
    ARTIST_CATEGORIES.find((c) => c.value === artist.category)?.label ??
    getCategoryLabel(artist.category);
  const location = [artist.location.city, artist.location.stateCode ?? artist.location.state]
    .filter(Boolean)
    .join(", ");
  const socialLinks = artist.social_links ?? {};
  const activeSocials = SOCIAL_CONFIG.filter(({ key }) => socialLinks[key]);

  return (
    <div className="pb-16">
      {liveEvent ? (
        <div className="relative overflow-hidden border-b border-red-500/30 bg-gradient-to-r from-red-950/80 via-red-900/40 to-background">
          <div className="absolute inset-0 animate-pulse bg-red-500/5" />
          <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-red-400">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
                </span>
                Live now
              </p>
              <p className="mt-1 font-medium">{liveEvent.title}</p>
              <p className="text-sm text-muted-foreground">
                {liveEvent.venue_name}
                {liveEvent.stage ? ` · ${liveEvent.stage}` : ""} ·{" "}
                {liveEvent.viewer_count.toLocaleString()} watching
              </p>
            </div>
            <Button href={`/artists/${username}/events/${liveEvent.slug}`} className="bg-red-600 hover:bg-red-500">
              Join live
            </Button>
          </div>
        </div>
      ) : null}

      <div className="relative h-48 sm:h-64 md:h-80">
        <Image src={banner} alt="" fill className="object-cover" priority sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="-mt-16 relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Avatar className="size-28 border-4 border-background shadow-2xl sm:size-32">
              <AvatarImage src={avatar} alt={artist.stage_name} />
              <AvatarFallback className="text-2xl">{artist.stage_name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold sm:text-4xl">{artist.stage_name}</h1>
                {artist.verified ? <BadgeCheck className="size-7 shrink-0 text-primary" /> : null}
              </div>
              <p className="mt-1 text-muted-foreground">@{username}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{categoryLabel}</Badge>
                {location ? (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {location}
                  </span>
                ) : null}
              </div>
              {artist.short_bio ? (
                <p className="mt-3 max-w-xl text-sm text-muted-foreground">{artist.short_bio}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pb-1">
            {!isOwner ? (
              <FollowButton artistId={artist.id} initialFollowing={following} disabled={false} />
            ) : null}
            {liveEvent ? (
              <Button href={`/artists/${username}/events/${liveEvent.slug}`}>Watch live</Button>
            ) : null}
            {showMessages && !isOwner ? (
              <MessageArtistButton artistId={artist.id} />
            ) : (
              <Button variant="secondary" href="#booking">
                Book me
              </Button>
            )}
            <ShareProfileButton username={username} displayName={artist.stage_name} />
          </div>
        </div>

        <section className="mt-10">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <StatCard label="Followers" value={stats.followers.toLocaleString()} />
            <StatCard label="Performances" value={stats.totalPerformances} />
            <StatCard label="Hours streamed" value={stats.totalHoursStreamed} />
            <StatCard label="Total views" value={stats.totalViews.toLocaleString()} />
            <StatCard label="Peak viewers" value={stats.peakLiveViewers.toLocaleString()} />
            <StatCard
              label="Avg rating"
              value={stats.averageRating != null ? stats.averageRating.toFixed(1) : "—"}
            />
            <StatCard label="Member since" value={new Date(stats.memberSince).getFullYear()} />
          </div>
        </section>

        <section className="mt-14">
          <SectionHeading>Upcoming shows</SectionHeading>
          {upcomingEvents.length === 0 ? (
            <p className="mt-4 text-muted-foreground">No upcoming performances — follow for announcements.</p>
          ) : (
            <ul className="mt-6 space-y-3">
              {upcomingEvents.map((event) => (
                <li
                  key={event.id}
                  className="glass-panel flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{event.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      {event.venue_name ? <span>{event.venue_name}</span> : null}
                      {event.stage ? <span>Stage: {event.stage}</span> : null}
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3.5" />
                        {new Date(event.scheduled_at).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {new Date(event.scheduled_at).toLocaleTimeString(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <EventCountdown scheduledAt={event.scheduled_at} />
                    <Button size="sm" variant="secondary" href={`/artists/${username}/events/${event.slug}`}>
                      RSVP
                    </Button>
                    {event.status === "live" ? (
                      <Button size="sm" href={`/artists/${username}/events/${event.slug}`}>
                        Watch
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-14">
          <SectionHeading>Past performances</SectionHeading>
          {pastEvents.length === 0 ? (
            <p className="mt-4 text-muted-foreground">Performance history will appear here.</p>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pastEvents.map((event) => (
                <li key={event.id} className="glass-panel group overflow-hidden rounded-xl">
                  <div className="relative aspect-video overflow-hidden">
                    <Image
                      src={event.thumbnail ?? banner}
                      alt=""
                      fill
                      className="object-cover transition group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="font-medium">{event.title}</p>
                      <p className="text-xs text-white/70">
                        {new Date(event.scheduled_at).toLocaleDateString()} · {event.venue_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Eye className="size-3.5" />
                      {event.viewer_count.toLocaleString()} views
                    </span>
                    <Button size="sm" variant="ghost" disabled title="Replay coming soon">
                      <Play className="size-3.5" />
                      Replay
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-14 grid gap-8 lg:grid-cols-2">
          <div>
            <SectionHeading>About</SectionHeading>
            <p className="mt-4 whitespace-pre-wrap text-muted-foreground">
              {artist.profiles?.bio ?? "Bio coming soon."}
            </p>
            {genres.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {genres.map((g) => (
                  <Badge key={g.id} variant="outline">
                    <Music2 className="mr-1 size-3" />
                    {g.name}
                  </Badge>
                ))}
              </div>
            ) : null}
            <dl className="mt-6 space-y-2 text-sm">
              {artist.years_performing != null ? (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Years performing</dt>
                  <dd>{artist.years_performing}+</dd>
                </div>
              ) : null}
              {artist.languages.length > 0 ? (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Languages</dt>
                  <dd>{artist.languages.join(", ")}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          {activeSocials.length > 0 ? (
            <div>
              <SectionHeading>Connect</SectionHeading>
              <ul className="mt-4 space-y-2">
                {activeSocials.map(({ key, label }) => (
                  <li key={key}>
                    <a
                      href={socialHref(key, socialLinks[key])}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass-panel flex items-center gap-2 rounded-lg px-4 py-3 text-sm transition hover:border-primary/40"
                    >
                      <Globe className="size-4 text-primary" />
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="mt-14">
          <SectionHeading>Featured videos</SectionHeading>
          {featuredVideos.length === 0 ? (
            <p className="mt-4 text-muted-foreground">Featured clips will appear here.</p>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredVideos.map((video) => (
                <li key={video.id} className="glass-panel overflow-hidden rounded-xl">
                  <div className="relative aspect-video">
                    <Image
                      src={video.thumbnail_url ?? video.url}
                      alt={video.title}
                      fill
                      className="object-cover"
                      sizes="33vw"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="size-10 text-white/90" />
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="font-medium">{video.title}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-14">
          <SectionHeading>Merchandise</SectionHeading>
          {products.length === 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {["Shirts", "Hoodies", "Stickers", "Albums", "Digital downloads"].map((item) => (
                <div
                  key={item}
                  className="glass-panel flex aspect-square flex-col items-center justify-center rounded-xl border-dashed p-4 text-center opacity-60"
                >
                  <p className="text-sm font-medium">{item}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Coming soon</p>
                </div>
              ))}
            </div>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => (
                <li key={product.id} className="glass-panel overflow-hidden rounded-xl">
                  {product.image_urls[0] ? (
                    <div className="relative aspect-square">
                      <Image src={product.image_urls[0]} alt={product.name} fill className="object-cover" />
                    </div>
                  ) : null}
                  <div className="p-4">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-primary">{formatCents(product.price_cents)}</p>
                    <Button size="sm" className="mt-2 w-full" href={`/artists/${username}/merch`}>
                      Shop
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading>Fan reviews</SectionHeading>
            {stats.averageRating != null ? (
              <div className="flex items-center gap-2 text-amber-400">
                <Star className="size-5 fill-current" />
                <span className="text-lg font-semibold">{stats.averageRating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({stats.reviewCount} reviews)</span>
              </div>
            ) : null}
          </div>
          {reviews.length === 0 ? (
            <p className="mt-4 text-muted-foreground">Be the first to leave a review after a show.</p>
          ) : (
            <ul className="mt-6 space-y-3">
              {reviews.map((review) => (
                <li key={review.id} className="glass-panel rounded-xl p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{review.reviewer_name}</p>
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} className="size-3.5 fill-current" />
                      ))}
                    </div>
                  </div>
                  {review.body ? (
                    <p className="mt-2 text-sm text-muted-foreground">{review.body}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="booking" className="mt-14">
          <SectionHeading>Contact & booking</SectionHeading>
          <div className="glass-panel mt-6 rounded-xl p-6">
            <p className="text-muted-foreground">
              Interested in booking {artist.stage_name} for your venue, festival, or private event?
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {showMessages && !isOwner ? (
                <MessageArtistButton artistId={artist.id} />
              ) : null}
              <Button variant="secondary" href="#booking">
                Request booking
              </Button>
              {artist.booking_email ? (
                <Button variant="outline" href={`mailto:${artist.booking_email}`}>
                  <Mail className="size-4" />
                  {artist.booking_email}
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-10 flex flex-wrap gap-2 border-t border-white/10 pt-8">
          <Button variant="ghost" size="sm" href={`/artists/${username}/merch`}>
            Merch store
          </Button>
          <Button variant="ghost" size="sm" href={`/artists/${username}/backstage`}>
            Backstage pass
          </Button>
          <Button variant="ghost" size="sm" href={`/walk-of-fame/${username}`}>
            Walk of fame
          </Button>
          {isOwner ? (
            <Button variant="ghost" size="sm" href="/artist/settings">
              Edit profile
            </Button>
          ) : null}
        </section>
      </div>
    </div>
  );
}
