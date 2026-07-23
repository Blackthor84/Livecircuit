import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FollowButton } from "@/components/artists/follow-button";
import { MessageArtistButton } from "@/components/messages/message-artist-button";
import {
  getArtistBySlug,
  getArtistEvents,
  getArtistTours,
} from "@/lib/data/queries";
import { formatCents } from "@/lib/format";
import { getSessionUser } from "@/lib/auth/session";
import { isFollowingArtist } from "@/lib/data/profiles";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  if (!artist) return { title: "Artist" };
  return {
    title: artist.stage_name,
    description: artist.profiles?.bio ?? `${artist.stage_name} on LiveCircuit`,
    openGraph: { images: artist.banner_url ? [artist.banner_url] : [] },
  };
}

export default async function ArtistProfilePage({ params }: Props) {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  if (!artist) notFound();

  const [tours, events] = await Promise.all([
    getArtistTours(slug, 6),
    getArtistEvents(slug, 10),
  ]);

  const user = await getSessionUser();
  const following =
    user && artist.id ? await isFollowingArtist(user.id, artist.id) : false;

  const banner =
    artist.banner_url ?? `https://picsum.photos/seed/${artist.slug}-banner/1600/500`;

  return (
    <div>
      <div className="relative h-48 sm:h-64 md:h-80">
        <Image src={banner} alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="-mt-16 relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold sm:text-4xl">{artist.stage_name}</h1>
              {artist.verified && <BadgeCheck className="size-7 text-primary" />}
            </div>
            <p className="mt-2 capitalize text-muted-foreground">{artist.category}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {artist.follower_count.toLocaleString()} followers ·{" "}
              {artist.monthly_listeners.toLocaleString()} monthly listeners
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <FollowButton artistId={artist.id} initialFollowing={following} disabled={!user} />
            {user && artist.user_id !== user.id ? (
              <MessageArtistButton artistId={artist.id} />
            ) : null}
            <Button variant="secondary" href={`/artists/${slug}/merch`}>
              Merch
            </Button>
            <Button variant="outline" href={`/artists/${slug}/backstage`}>
              Backstage Pass
            </Button>
            <Button variant="outline" href={`/walk-of-fame/${slug}`}>
              Walk of Fame
            </Button>
          </div>
        </div>

        <Tabs defaultValue="tours" className="mt-10">
          <TabsList>
            <TabsTrigger value="tours">Tours</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>
          <TabsContent value="tours" className="mt-6 space-y-4">
            {tours.length === 0 && (
              <p className="text-muted-foreground">No published tours yet — follow for announcements.</p>
            )}
            {tours.map((tour) => (
              <Link
                key={tour.id}
                href={`/artists/${slug}/tours/${tour.slug}`}
                className="glass-panel block rounded-xl p-6 transition hover:border-primary/40"
              >
                <h3 className="text-lg font-medium">{tour.title}</h3>
                <p className="text-sm text-muted-foreground">{tour.description}</p>
              </Link>
            ))}
          </TabsContent>
          <TabsContent value="events" className="mt-6 space-y-3">
            {events.map((event) => (
              <div key={event.id} className="glass-panel flex items-center justify-between rounded-xl p-4">
                <div>
                  <p className="font-medium">{event.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(event.scheduled_at).toLocaleString()}
                  </p>
                </div>
                <Button size="sm" href={`/artists/${slug}/events/${event.slug}`}>
                  {formatCents(event.tour_stops?.ticket_price_cents ?? 0)}
                </Button>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="about" className="mt-6 max-w-2xl text-muted-foreground">
            <p>{artist.profiles?.bio ?? "Bio coming soon."}</p>
            <Button variant="link" className="mt-4 px-0" href="#">
              Social links <ExternalLink className="size-3.5" />
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
