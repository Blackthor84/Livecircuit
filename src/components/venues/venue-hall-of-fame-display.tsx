"use client";

import Link from "next/link";
import { Trophy, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants";
import { formatHofMetric } from "@/lib/services/venue-hof-format";
import type { VenueHallOfFameReport } from "@/lib/types/venue-hof";

export function VenueHallOfFameDisplay({ report }: { report: VenueHallOfFameReport }) {
  return (
    <div className="space-y-10">
      <div className="glass-panel rounded-xl p-6 text-center">
        <Link href={`/livecircuit/venues/${report.venueSlug}`} className="text-sm text-primary hover:underline">
          ← {report.venueName}
        </Link>
        <h1 className="mt-3 flex items-center justify-center gap-2 text-3xl font-bold">
          <Trophy className="h-8 w-8 text-amber-400" />
          Hall of Fame
        </h1>
        <p className="mt-2 text-muted-foreground">Legends who defined this venue on LiveCircuit.</p>
        {report.isHallOfFameVenue ? (
          <Badge className="mt-4 gap-1">
            <Star className="h-3 w-3 fill-current" />
            Hall of Fame venue
          </Badge>
        ) : null}
        <Button variant="link" className="mt-4" href={ROUTES.walkOfFame}>
          Digital Walk of Fame →
        </Button>
      </div>

      {report.entries.length === 0 ? (
        <p className="text-center text-muted-foreground">
          Records will appear as fans attend shows, tip artists, and leave reviews.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {report.entries.map((entry) => (
            <li key={entry.category}>
              <Card className="glass-panel h-full border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{entry.categoryLabel}</CardTitle>
                  <p className="text-xs text-muted-foreground">{entry.blurb}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold">{entry.displayName}</p>
                  {entry.subtitle ? <p className="text-sm text-muted-foreground">{entry.subtitle}</p> : null}
                  <p className="mt-3 text-2xl font-bold tabular-nums text-amber-400/90">
                    {formatHofMetric(entry.metricValue, entry.metricLabel)}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{entry.metricLabel}</p>
                  {entry.linkHref ? (
                    <Button size="sm" variant="outline" className="mt-4" href={entry.linkHref}>
                      View
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
