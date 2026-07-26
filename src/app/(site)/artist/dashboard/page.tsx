import type { Metadata } from "next";
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
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Artist dashboard" };

export default async function ArtistDashboardPage() {
  await requireRoles(["artist", "admin", "super_admin"], "/register?role=artist");

  const user = await getSessionUser();
  if (!user) redirect("/login");

  const artist = await getArtistForUser(user.id);
  if (!artist) redirect("/artist/settings");

  const [analytics, tours, momentumPayload, upcomingEvents, features] = await Promise.all([
    getArtistDashboardAnalytics(artist.id, artist.slug),
    listArtistTours(artist.id),
    getArtistMomentumForUser(user.id),
    listArtistUpcomingEvents(artist.id),
    getViewerFeatureAccess(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Artist dashboard</h1>
          <p className="text-muted-foreground">Audience insights, revenue, and upcoming performances.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" href="/artist/merch">
            Merch
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
          <Button variant="outline" href="/artist/tour-planner">
            AI Tour Planner
          </Button>
          {features.canAccess("creator_marketplace") ? (
            <Button variant="outline" href="/marketplace">
              Hire creators
            </Button>
          ) : null}
          <Button variant="outline" href="/artist/tours/new">
            Create tour
          </Button>
          <Button href={ROUTES.artistEventsNew}>Create event</Button>
        </div>
      </div>
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
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Upcoming events</h2>
          <Button variant="link" href={ROUTES.artistEventsNew} className="px-0">
            Create event →
          </Button>
        </div>
        <ArtistUpcomingEvents events={upcomingEvents} artistSlug={artist.slug} />
      </section>
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Your tours</h2>
        <div className="mt-4">
          <ArtistToursList tours={tours} artistSlug={artist.slug} />
        </div>
      </section>
      <div className="mt-10">
        <ArtistDashboardCharts data={analytics} artistSlug={artist.slug} artistId={artist.id} />
      </div>
    </div>
  );
}
