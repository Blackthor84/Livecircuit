import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EventCoHostsPanel } from "@/components/artist/event-cohosts-panel";
import { TicketScanner } from "@/components/artist/ticket-scanner";
import { LiveHostControls } from "@/components/live/live-host-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireRoles } from "@/lib/auth/guards";
import { getSessionUser } from "@/lib/auth/session";
import { getArtistEventById, eventLivePath } from "@/lib/data/artist-events";
import { ROUTES } from "@/lib/constants";
import { formatCents } from "@/lib/format";
import { getMilestoneEnvStatus } from "@/lib/config/env";
import { listEventHosts } from "@/lib/services/event-hosts.service";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;
  const user = await getSessionUser();
  if (!user) return { title: "Event details" };
  const event = await getArtistEventById(user.id, eventId);
  return { title: event?.title ?? "Event details" };
}

export default async function ArtistEventDetailPage({ params }: Props) {
  await requireRoles(["artist", "admin"], "/register?role=artist");

  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { eventId } = await params;
  const event = await getArtistEventById(user.id, eventId);
  if (!event) notFound();

  const env = getMilestoneEnvStatus();
  const livePath = eventLivePath(event.artistSlug, event.slug);
  const scheduled = new Date(event.scheduled_at).toLocaleString();
  const supabase = await createClient();
  const coHosts = await listEventHosts(supabase, event.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" href={ROUTES.artistDashboard}>
          ← Dashboard
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{event.title}</h1>
            <Badge>{event.status}</Badge>
          </div>
          <p className="mt-2 text-muted-foreground">
            {event.tour_stops?.virtual_location_label ?? "Virtual"} · {scheduled}
          </p>
          <p className="text-sm text-muted-foreground">
            Tickets {formatCents(event.tour_stops?.ticket_price_cents ?? 0)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" href={livePath}>
            {event.status === "live" ? "Enter live room" : "Preview live page"}
          </Button>
          <Button variant="outline" href={ROUTES.checkout + `?event=${event.id}&type=ticket`}>
            Ticket checkout
          </Button>
        </div>
      </div>

      <section className="mt-8 space-y-4 rounded-xl border border-white/10 bg-card/50 p-6">
        <h2 className="text-lg font-semibold">Go live</h2>
        <p className="text-sm text-muted-foreground">
          When you are ready, start the broadcast. Fans with tickets can join the waiting room until
          you go live, then watch in real time.
        </p>
        {!env.readyForGoLive ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
            Configure Supabase
            {env.streamingProvider === "livekit" ? " and LiveKit" : ""} in your environment before
            going live. See <code className="text-xs">.env.example</code>.
          </p>
        ) : null}
        <LiveHostControls
          eventId={event.id}
          status={event.status}
          artistSlug={event.artistSlug}
          eventSlug={event.slug}
          liveUrl={livePath}
        />
        {event.streams ? (
          <p className="text-xs text-muted-foreground">
            Stream provider: {event.streams.provider} · status {event.streams.status}
          </p>
        ) : null}
      </section>

      <section className="mt-6 space-y-4 rounded-xl border border-white/10 bg-card/50 p-6">
        <h2 className="text-lg font-semibold">Co-hosts</h2>
        <p className="text-sm text-muted-foreground">
          Invite another performer or moderator to publish alongside you in the LiveKit room.
        </p>
        <EventCoHostsPanel eventId={event.id} initialHosts={coHosts} />
      </section>

      <section className="mt-6 space-y-4 rounded-xl border border-white/10 bg-card/50 p-6">
        <h2 className="text-lg font-semibold">Ticket check-in</h2>
        <p className="text-sm text-muted-foreground">
          Verify fan QR codes at the virtual door before or during the show.
        </p>
        <TicketScanner />
      </section>

      <section className="mt-6 text-sm text-muted-foreground">
        <p>
          Public event URL:{" "}
          <Link href={livePath} className="text-primary hover:underline">
            {livePath}
          </Link>
        </p>
        {event.started_at ? <p>Started: {new Date(event.started_at).toLocaleString()}</p> : null}
        {event.ended_at ? <p>Ended: {new Date(event.ended_at).toLocaleString()}</p> : null}
      </section>
    </div>
  );
}
