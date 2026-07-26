import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArtistCard } from "@/components/artists/artist-card";
import { CheckoutSuccessBanner } from "@/components/checkout/checkout-success-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUserProfile } from "@/lib/auth/guards";
import {
  getFollowingArtists,
  getUserOrders,
  getUserTickets,
} from "@/lib/data/profiles";
import { getFanPassportReport } from "@/lib/data/fan-passport";
import { getVenueCollectionReport } from "@/lib/data/venue-collection";
import { getFriendsHubReport } from "@/lib/data/friends";
import { getAchievementsReport } from "@/lib/data/achievements";
import { getGamificationReport } from "@/lib/data/gamification";
import { getCoinBalance } from "@/lib/data/coins";
import { getViewerFeatureAccess } from "@/lib/features/guard";
import { TicketQrDisplay } from "@/components/tickets/ticket-qr-display";
import { formatCents } from "@/lib/format";
import type { ArtistCategory } from "@/types/database";

export const metadata: Metadata = { title: "Dashboard" };

export default async function FanDashboardPage() {
  const { user, profile } = await requireUserProfile();
  const features = await getViewerFeatureAccess();

  const [following, tickets, orders, passport, venueCollection, friendsHub, coinBalance, achievements, gamification] =
    await Promise.all([
    getFollowingArtists(user.id, 6),
    getUserTickets(user.id, 5),
    getUserOrders(user.id, 5),
    getFanPassportReport(user.id),
    getVenueCollectionReport(user.id),
    getFriendsHubReport(user.id),
    getCoinBalance(user.id),
    getAchievementsReport(user.id),
    getGamificationReport(user.id),
  ]);

  const profileComplete = Boolean(profile.country_id && profile.city_id && profile.onboarding_completed);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Your dashboard</h1>
      <p className="mt-2 text-muted-foreground">Tickets, follows, and purchase history.</p>

      <Suspense fallback={null}>
        {features.canAccess("ticketing") ? <CheckoutSuccessBanner /> : null}
      </Suspense>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card className="glass-panel border-white/10 md:col-span-2">
          <CardHeader>
            <CardTitle>Upcoming tickets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {tickets.length === 0 && (
              <p className="text-muted-foreground">No tickets yet — explore upcoming shows.</p>
            )}
            {tickets.map((t) => {
              const raw = t.events as unknown;
              const event = (Array.isArray(raw) ? raw[0] : raw) as {
                slug: string;
                title: string;
                scheduled_at: string;
                artists: { slug: string; stage_name: string } | { slug: string; stage_name: string }[];
              } | null;
              if (!event) return null;
              const artistMeta = Array.isArray(event.artists) ? event.artists[0] : event.artists;
              const qr = (t as { qr_code?: string | null }).qr_code;
              const eventPath = `/artists/${artistMeta?.slug}/events/${event.slug}`;
              return (
                <div
                  key={t.id}
                  className="flex flex-col gap-3 rounded-lg border border-white/10 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <Link href={eventPath} className="min-w-0 flex-1 hover:text-primary">
                    <p className="font-medium">{event.title}</p>
                    <p className="text-muted-foreground">
                      {artistMeta?.stage_name} · {new Date(event.scheduled_at).toLocaleString()} ·{" "}
                      {formatCents(t.price_cents)} · <span className="uppercase">{t.tier}</span>
                    </p>
                  </Link>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" href={eventPath}>
                      Enter waiting room
                    </Button>
                    {qr ? <TicketQrDisplay code={qr} label="Show at virtual door" /> : null}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle>Fan Passport</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-bold tabular-nums">{passport?.progress.stampCount ?? 0}</p>
            <p className="text-sm text-muted-foreground">Stamps from venues and shows you&apos;ve attended.</p>
            <Button size="sm" href="/passport">
              Open passport
            </Button>
            <Button size="sm" variant="outline" href="/seasons">
              Seasons
            </Button>
            <Button size="sm" variant="outline" href="/collections/venues">
              Venues
            </Button>
            {features.canAccess("friend_system") ? (
              <Button size="sm" variant="outline" href="/friends">
                Friends
              </Button>
            ) : null}
            {features.canAccess("gamification") ? (
              <Button size="sm" variant="outline" href="/gamification">
                Gamification{gamification ? ` · Lv ${gamification.level}` : ""}
              </Button>
            ) : null}
            {features.canAccess("achievements") ? (
              <Button size="sm" variant="outline" href="/achievements">
                Achievements{achievements ? ` (${achievements.totalEarned})` : ""}
              </Button>
            ) : null}
            {features.canAccess("coins") ? (
              <Button size="sm" variant="outline" href="/coins">
                Coins
              </Button>
            ) : null}
            {!profileComplete ? (
              <Button size="sm" variant="outline" href="/settings">
                Complete profile
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel mt-6 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Venue collection</CardTitle>
          <Button variant="link" href="/collections/venues" className="px-0">
            View all →
          </Button>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-6">
          <div>
            <p className="text-3xl font-bold tabular-nums">{venueCollection.progress.completionPercent}%</p>
            <p className="text-sm text-muted-foreground">
              {venueCollection.progress.visitedCount} venues · {venueCollection.progress.favoriteCount} favorites
            </p>
          </div>
          {venueCollection.mostAttended ? (
            <p className="text-sm text-muted-foreground">
              Most visited: <span className="text-foreground">{venueCollection.mostAttended.venueName}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      {features.canAccess("friend_system") ? (
      <Card className="glass-panel mt-6 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Friends</CardTitle>
          <Button variant="link" href="/friends" className="px-0">
            Open hub →
          </Button>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-6">
          <div>
            <p className="text-3xl font-bold tabular-nums">{friendsHub.friends.length}</p>
            <p className="text-sm text-muted-foreground">
              {friendsHub.incoming.length > 0
                ? `${friendsHub.incoming.length} pending request${friendsHub.incoming.length === 1 ? "" : "s"}`
                : "Connected fans"}
            </p>
          </div>
          {friendsHub.sharedEvents[0] ? (
            <p className="text-sm text-muted-foreground">
              Next shared show:{" "}
              <span className="text-foreground">{friendsHub.sharedEvents[0].eventTitle}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>
      ) : null}

      {features.canAccess("coins") ? (
      <Card className="glass-panel mt-6 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>LiveCircuit Coins</CardTitle>
          <Button variant="link" href="/coins" className="px-0">
            Open wallet →
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold tabular-nums">{coinBalance.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Earn from shows, reviews, seasons, and daily login.</p>
        </CardContent>
      </Card>
      ) : null}

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Artists you follow</h2>
          <Link href="/artists" className="text-sm text-primary hover:underline">
            Discover more
          </Link>
        </div>
        {following.length === 0 ? (
          <p className="mt-4 text-muted-foreground">Follow artists to see them here.</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {following.map((row) => {
              const a = row as {
                slug: string;
                stage_name: string;
                banner_url?: string | null;
                verified?: boolean;
                category?: string;
                follower_count?: number;
              };
              if (!a?.slug) return null;
              return (
                <ArtistCard
                  key={a.slug}
                  artist={{
                    slug: a.slug,
                    stage_name: a.stage_name,
                    banner_url: a.banner_url ?? null,
                    verified: a.verified,
                    category: a.category as ArtistCategory | undefined,
                    follower_count: a.follower_count,
                  }}
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Purchase history</h2>
        <div className="mt-4 space-y-2">
          {orders.length === 0 && (
            <p className="text-sm text-muted-foreground">Orders for tickets, merch, tips, and VIP appear here.</p>
          )}
          {orders.map((o) => {
            const items = (o as { order_items?: unknown }).order_items;
            const lines = Array.isArray(items) ? items : items ? [items] : [];
            const detail = lines
              .map((line) => {
                const row = line as {
                  quantity: number;
                  unit_price_cents: number;
                  events?: { title: string } | { title: string }[] | null;
                  products?: { name: string } | { name: string }[] | null;
                };
                const eventTitle = row.events
                  ? Array.isArray(row.events)
                    ? row.events[0]?.title
                    : row.events.title
                  : null;
                const productName = row.products
                  ? Array.isArray(row.products)
                    ? row.products[0]?.name
                    : row.products.name
                  : null;
                const label = eventTitle ?? productName;
                return label
                  ? `${row.quantity}× ${label} (${formatCents(row.unit_price_cents, o.currency ?? "USD")})`
                  : null;
              })
              .filter(Boolean)
              .join(" · ");
            return (
              <div
                key={o.id}
                className="flex flex-col gap-1 rounded-lg border border-white/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span className="capitalize font-medium">{o.order_type}</span>
                  {detail ? <p className="text-muted-foreground">{detail}</p> : null}
                </div>
                <span className="text-muted-foreground">{o.status}</span>
                <span>{formatCents(o.total_cents, o.currency ?? "USD")}</span>
                <span className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
