"use client";

import type { ProductionHistoryEntry } from "@/lib/production/studio";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";

export function ProductionHistoryPanel({ history }: { history: ProductionHistoryEntry[] }) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Rehearsals and sound checks will be saved here so you can compare improvements over time.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {history.map((entry) => (
        <li key={entry.id} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium capitalize">{entry.session_type.replace("_", " ")}</span>
            <Badge variant="outline">{new Date(entry.created_at).toLocaleString()}</Badge>
          </div>
          {Object.keys(entry.summary).length > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {JSON.stringify(entry.summary).slice(0, 120)}
              {JSON.stringify(entry.summary).length > 120 ? "…" : ""}
            </p>
          ) : null}
          {entry.fan_ratings.length > 0 ? (
            <p className="mt-1 text-xs text-emerald-300">
              {entry.fan_ratings.length} fan rating(s) recorded
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function ProductionHistoryCard({ history }: { history: ProductionHistoryEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-4" />
          Production history
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ProductionHistoryPanel history={history} />
      </CardContent>
    </Card>
  );
}
