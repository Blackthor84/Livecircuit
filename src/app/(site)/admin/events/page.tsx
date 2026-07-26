import type { Metadata } from "next";
import Link from "next/link";
import { AdminCommandShell } from "@/components/admin/command-center/admin-command-shell";
import { AdminEntityTable } from "@/components/admin/command-center/admin-entity-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAdminEvents } from "@/lib/data/admin-entities";

export const metadata: Metadata = { title: "Events — Admin" };

export default async function AdminEventsPage() {
  const events = await listAdminEvents(100);

  return (
    <AdminCommandShell title="Events" subtitle="Scheduled, live, and ended events with viewer metrics.">
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Events ({events.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminEntityTable
            rows={events}
            emptyMessage="No events found."
            columns={[
              {
                key: "title",
                header: "Event",
                cell: (row) => (
                  <Link href={`/events/${row.slug ?? row.id}`} className="font-medium hover:text-primary">
                    {row.title}
                  </Link>
                ),
              },
              {
                key: "artist",
                header: "Artist",
                cell: (row) => {
                  const artist = Array.isArray(row.artists) ? row.artists[0] : row.artists;
                  return artist?.stage_name ?? "—";
                },
              },
              {
                key: "status",
                header: "Status",
                cell: (row) => (
                  <Badge variant={row.status === "live" ? "default" : "secondary"} className="capitalize">
                    {row.status}
                  </Badge>
                ),
              },
              {
                key: "scheduled",
                header: "Scheduled",
                cell: (row) => (row.scheduled_at ? new Date(row.scheduled_at).toLocaleString() : "—"),
              },
              {
                key: "viewers",
                header: "Viewers",
                cell: (row) => row.viewer_count ?? 0,
                className: "tabular-nums",
              },
              {
                key: "peak",
                header: "Peak",
                cell: (row) => row.peak_viewers ?? 0,
                className: "tabular-nums",
              },
            ]}
          />
        </CardContent>
      </Card>
    </AdminCommandShell>
  );
}
