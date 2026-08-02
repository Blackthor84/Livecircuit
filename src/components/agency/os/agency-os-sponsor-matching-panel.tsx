"use client";

import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgencySponsorMatchRow } from "@/lib/agency/business-os-types";

export function AgencyOsSponsorMatchingPanel({ matches }: { matches: AgencySponsorMatchRow[] }) {
  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" /> AI sponsor matching
        </CardTitle>
      </CardHeader>
      <CardContent>
        {matches.length ? (
          <ul className="space-y-3">
            {matches.map((m) => (
              <li key={m.id} className="rounded-xl border border-white/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{m.sponsor_name}</p>
                    <p className="text-sm text-muted-foreground">Matched with {m.artist_name}</p>
                  </div>
                  <Badge variant="secondary">{m.match_score}% match</Badge>
                </div>
                {m.reasons.length ? (
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {m.reasons.map((r) => <li key={r}>• {r}</li>)}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Audience demographics, genre, attendance, and engagement aligned.</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sponsor matches are generated from roster demographics, event performance, and CRM contacts. Browse the marketplace below to create proposals.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
