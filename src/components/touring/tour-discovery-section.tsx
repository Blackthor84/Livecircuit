import Link from "next/link";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { DiscoverableTourEvent } from "@/lib/virtual-touring/discovery";
import { formatCents } from "@/lib/format";
import { audienceModeLabel } from "@/lib/virtual-touring/access";

const FILTERS = [
  { id: "near_me", label: "Shows Near Me" },
  { id: "my_state", label: "Shows In My State" },
  { id: "country", label: "Across The Country" },
  { id: "worldwide", label: "Worldwide Shows" },
  { id: "upcoming_stops", label: "Upcoming Tour Stops" },
] as const;

export function TourDiscoverySection({
  events,
  activeFilter,
}: {
  events: DiscoverableTourEvent[];
  activeFilter: string;
}) {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold">Tour discovery</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Follow artists city to city — virtual stops with real tour energy.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={activeFilter === f.id ? "default" : "secondary"}
            href={`/discover?filter=${f.id}`}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {events.map((event) => (
          <Card key={event.id} className="glass-panel flex flex-col gap-4 border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{event.tourTitle ?? "Tour"}</Badge>
                <Badge variant="secondary">{audienceModeLabel(event.audienceMode as never)}</Badge>
              </div>
              <p className="mt-2 font-medium">{event.title}</p>
              <p className="flex items-center gap-1 text-sm text-primary">
                <MapPin className="size-3.5" />
                {[event.tourCity, event.tourStateName ?? event.tourStateCode].filter(Boolean).join(", ")}
              </p>
              <p className="text-sm text-muted-foreground">
                {event.artistName} · {new Date(event.scheduledAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{formatCents(event.ticketPriceCents)}</span>
              <Button size="sm" href={`/artists/${event.artistSlug}/events/${event.slug}`}>
                View stop
              </Button>
            </div>
          </Card>
        ))}
        {!events.length ? (
          <p className="text-sm text-muted-foreground">No tour stops match this filter yet.</p>
        ) : null}
      </div>
    </section>
  );
}

export function LocalCommunityCard({
  cityName,
  stateCode,
  memberCount,
  communitySlug,
}: {
  cityName: string;
  stateCode: string | null;
  memberCount: number;
  communitySlug: string;
}) {
  return (
    <Card className="glass-panel border-white/10 p-4">
      <p className="text-sm font-medium">{cityName} Fans</p>
      <p className="text-xs text-muted-foreground">
        {stateCode ? `${stateCode} · ` : ""}
        {memberCount.toLocaleString()} members
      </p>
      <Button size="sm" variant="secondary" className="mt-3" href={`/discover?community=${communitySlug}`}>
        Join local community
      </Button>
    </Card>
  );
}
