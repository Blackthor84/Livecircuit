import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LiveOperationsReport } from "@/lib/data/admin-live-ops";

export function AdminLiveOpsTable({ report }: { report: LiveOperationsReport }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="glass-panel border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Concurrent viewers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{report.totalConcurrentViewers}</p>
          </CardContent>
        </Card>
        <Card className="glass-panel border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Active streams</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {report.activeStreams.filter((s) => s.status === "live").length}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-panel border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Moderation backlog</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{report.moderationBacklog}</p>
          </CardContent>
        </Card>
        <Card className="glass-panel border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Mod actions (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{report.moderationActions24h}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Streams & scheduled events</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {!report.activeStreams.length ? (
            <p className="text-sm text-muted-foreground">No live or scheduled events in the queue.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Viewers</TableHead>
                  <TableHead>Peak</TableHead>
                  <TableHead>Chat (30m)</TableHead>
                  <TableHead>Reactions (30m)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.activeStreams.map((stream) => (
                  <TableRow key={stream.eventId}>
                    <TableCell>
                      <Link href={`/events/${stream.eventId}`} className="font-medium hover:text-primary">
                        {stream.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {stream.artistSlug ? (
                        <Link href={`/artists/${stream.artistSlug}`} className="text-muted-foreground hover:text-foreground">
                          {stream.artistName}
                        </Link>
                      ) : (
                        stream.artistName
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={stream.status === "live" ? "default" : "secondary"} className="capitalize">
                        {stream.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{stream.viewerCount}</TableCell>
                    <TableCell className="tabular-nums">{stream.peakViewers}</TableCell>
                    <TableCell className="tabular-nums">{stream.chatMessages30m}</TableCell>
                    <TableCell className="tabular-nums">{stream.reactions30m}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
