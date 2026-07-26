import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MilestoneEnvStatus } from "@/lib/config/env";

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <Badge variant={ok ? "default" : "destructive"}>{ok ? "Connected" : "Not configured"}</Badge>
  );
}

export function AdminHealthCards({
  health,
  entityCounts,
}: {
  health: MilestoneEnvStatus;
  entityCounts: {
    venues: number;
    events: number;
    tours: number;
    genres: number;
    sponsorOrgs: number;
    liveEvents: number;
  };
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle className="text-base">Infrastructure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span>Supabase</span>
            <StatusBadge ok={health.supabase} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>Stripe payments</span>
            <StatusBadge ok={health.stripe} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>
              Streaming ({health.streamingProvider})
            </span>
            <StatusBadge ok={health.streamingProvider === "placeholder" || health.livekit} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>Go-live ready</span>
            <StatusBadge ok={health.readyForGoLive} />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle className="text-base">Catalog footprint</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Venues</p>
            <p className="text-xl font-semibold tabular-nums">{entityCounts.venues}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Events</p>
            <p className="text-xl font-semibold tabular-nums">{entityCounts.events}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Live now</p>
            <p className="text-xl font-semibold tabular-nums">{entityCounts.liveEvents}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tours</p>
            <p className="text-xl font-semibold tabular-nums">{entityCounts.tours}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Genres</p>
            <p className="text-xl font-semibold tabular-nums">{entityCounts.genres}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Sponsor orgs</p>
            <p className="text-xl font-semibold tabular-nums">{entityCounts.sponsorOrgs}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
