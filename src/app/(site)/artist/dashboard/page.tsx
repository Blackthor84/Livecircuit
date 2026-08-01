import type { Metadata } from "next";
import { ArtistActiveTourPanel } from "@/components/artist/artist-active-tour-panel";
import { ArtistDashboardCharts } from "@/components/dashboard/artist-dashboard-charts";
import { Button } from "@/components/ui/button";
import { requireRoles } from "@/lib/auth/guards";
import { getArtistForUser, getSessionUser } from "@/lib/auth/session";
import { getArtistDashboardAnalytics } from "@/lib/data/artist-analytics";
import { listArtistTours } from "@/lib/data/artist-tours";
import { ArtistToursList } from "@/components/artist/artist-tours-list";
import { ArtistUpcomingEvents } from "@/components/artist/artist-upcoming-events";
import { ArtistMomentumSummary } from "@/components/artist/artist-momentum-dashboard";
import { getArtistMomentumForUser } from "@/lib/data/artist-momentum";
import { getViewerFeatureAccess } from "@/lib/features/guard";
import { listArtistUpcomingEvents } from "@/lib/data/artist-events";
import { ROUTES } from "@/lib/constants";
import { getArtistActiveTourSnapshot } from "@/lib/touring/tour-context";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Artist dashboard" };

export default async function ArtistDashboardPage() {
  await requireRoles(["artist", "admin", "super_admin"], "/register?role=artist");

  const user = await getSessionUser();
  if (!user) redirect("/login");

  const artist = await getArtistForUser(user.id);
  if (!artist) redirect("/artist/settings");

  const [analytics, tours, momentumPayload, upcomingEvents, features, activeTour] = await Promise.all([
    getArtistDashboardAnalytics(artist.id, artist.slug),
    listArtistTours(artist.id),
    getArtistMomentumForUser(user.id),
    listArtistUpcomingEvents(artist.id),
    getViewerFeatureAccess(),
    getArtistActiveTourSnapshot(artist.id),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Artist dashboard</h1>
          <p className="text-muted-foreground">
            Build digital tours, schedule stops, and track your route from city to city.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/artist/tours/new">Create tour</Button>
          <Button variant="outline" href="/artist/tour-planner">
            AI Tour Planner
          </Button>
          <Button variant="outline" href="/artist/merch">
            Tour merch
          </Button>
          <Button variant="outline" href="/artist/settings">
            Edit profile
          </Button>
          <Button variant="outline" href="/artist/backstage">
            Backstage Pass
          </Button>
          <Button variant="outline" href="/artist/momentum">
            Momentum
          </Button>
          {features.canAccess("creator_marketplace") ? (
            <Button variant="outline" href="/marketplace">
              Hire creators
            </Button>
          ) : null}
        </div>
      </div>

      {activeTour ? (
        <section className="mt-10">
          <ArtistActiveTourPanel snapshot={activeTour} artistSlug={artist.slug} />
        </section>
      ) : null}

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Your tours</h2>
            <p className="text-sm text-muted-foreground">
              Tours are the primary object — every stop, ticket, and performance belongs to a route.
            </p>
          </div>
          <Button variant="link" href="/artist/tours/new" className="px-0">
            Create tour →
          </Button>
        </div>
        <ArtistToursList tours={tours} artistSlug={artist.slug} />
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Upcoming tour stops</h2>
          <Button variant="link" href="/artist/tours/new" className="px-0">
            Add to a tour →
          </Button>
        </div>
        <ArtistUpcomingEvents events={upcomingEvents} artistSlug={artist.slug} />
      </section>

      {momentumPayload?.report ? (
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Momentum</h2>
            <Button variant="link" href="/artist/momentum" className="px-0">
              Full breakdown →
            </Button>
          </div>
          <ArtistMomentumSummary report={momentumPayload.report} compact />
        </section>
      ) : null}

      <div className="mt-10">
        <ArtistDashboardCharts data={analytics} artistSlug={artist.slug} artistId={artist.id} />
      </div>
    </div>
  );
}
