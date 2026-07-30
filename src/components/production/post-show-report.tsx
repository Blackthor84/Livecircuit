import { ProductionHistoryPanel } from "@/components/production/production-history-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/format";
import type { ProductionHistoryEntry } from "@/lib/production/studio";
import { BarChart3, MessageSquare, Star, Users } from "lucide-react";

export type PostShowReportData = {
  eventTitle: string;
  viewerCount: number;
  peakViewers: number;
  chatMessages: number;
  status: string;
  ticketHolders: number;
  tipTotalCents: number;
  reactionCount: number;
  watchMinutes: number | null;
  producerNotes: Array<{ body: string; created_at: string }>;
  fanFeedback: unknown[];
  fanRatingsSummary: {
    audio: number | null;
    video: number | null;
    lighting: number | null;
    camera: number | null;
    sync: number | null;
    overall: number | null;
  };
  productionHistory: ProductionHistoryEntry[];
  technical: {
    droppedFrames: unknown;
    networkQuality: unknown;
    reconnectAttempts: unknown;
  };
  generatedAt: string;
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function RatingRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <span className="flex items-center gap-1 font-medium">
        {value != null ? (
          <>
            {value}/5 <Star className="size-3 fill-amber-400 text-amber-400" />
          </>
        ) : (
          "—"
        )}
      </span>
    </div>
  );
}

export function PostShowReport({ report }: { report: PostShowReportData }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5 text-violet-300" />
          <p className="text-sm uppercase tracking-wide text-violet-300">Post-show report</p>
        </div>
        <h1 className="text-2xl font-bold">{report.eventTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generated {new Date(report.generatedAt).toLocaleString()}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Peak viewers" value={report.peakViewers} />
        <Stat label="Final viewers" value={report.viewerCount} />
        <Stat label="Chat messages" value={report.chatMessages} />
        <Stat label="Reactions" value={report.reactionCount} />
        <Stat label="Ticket holders" value={report.ticketHolders} />
        <Stat label="Tips" value={formatCents(report.tipTotalCents)} />
        <Stat label="Show duration" value={report.watchMinutes != null ? `${report.watchMinutes} min` : "—"} />
        <Stat label="Status" value={report.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="size-4" />
              Test fan ratings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <RatingRow label="Audio" value={report.fanRatingsSummary.audio} />
            <RatingRow label="Video" value={report.fanRatingsSummary.video} />
            <RatingRow label="Lighting" value={report.fanRatingsSummary.lighting} />
            <RatingRow label="Camera" value={report.fanRatingsSummary.camera} />
            <RatingRow label="Sync" value={report.fanRatingsSummary.sync} />
            <RatingRow label="Overall" value={report.fanRatingsSummary.overall} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Technical summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Dropped frames: {String(report.technical.droppedFrames ?? "Not recorded")}</p>
            <p>Network quality: {String(report.technical.networkQuality ?? "Not recorded")}</p>
            <p>Reconnect attempts: {String(report.technical.reconnectAttempts ?? "Not recorded")}</p>
          </CardContent>
        </Card>
      </div>

      {report.producerNotes.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="size-4" />
              Producer notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {report.producerNotes.map((note, index) => (
                <li key={`${note.created_at}-${index}`} className="rounded-lg border border-white/10 p-3">
                  <p>{note.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(note.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" />
            Production history
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProductionHistoryPanel history={report.productionHistory} />
        </CardContent>
      </Card>

      {report.fanFeedback.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fan feedback comments</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {(report.fanFeedback as Array<{ reviewer_label?: string; comment?: string }>).map(
                (item, index) =>
                  item.comment ? (
                    <li key={index} className="rounded-lg border border-white/10 p-3">
                      <Badge variant="outline" className="mb-2">
                        {item.reviewer_label ?? "Test fan"}
                      </Badge>
                      <p className="italic">&ldquo;{item.comment}&rdquo;</p>
                    </li>
                  ) : null
              )}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
