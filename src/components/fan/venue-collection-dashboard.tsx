"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Building2, Heart, MapPin, Medal, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { VenueCollectionReport } from "@/lib/types/venue-collection";

export function VenueCollectionDashboard({ report }: { report: VenueCollectionReport }) {
  const { progress: p } = report;

  return (
    <div className="space-y-10">
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Building2 className="h-6 w-6 text-primary" />
            Venue collection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-4xl font-bold tabular-nums">{p.completionPercent}%</p>
            <p className="text-sm text-muted-foreground">
              {p.visitedCount} of {p.totalCollectible} venues collected
            </p>
            <Progress className="mt-3 h-3" value={p.completionPercent} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-muted-foreground">States</p>
              <p className="font-medium">
                {p.statesVisited} / {p.statesTotal}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Countries</p>
              <p className="font-medium">
                {p.countriesVisited} / {p.countriesTotal}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Favorites</p>
              <p className="font-medium">{p.favoriteCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {report.mostAttended ? (
        <section className="glass-panel rounded-xl p-5">
          <p className="text-sm text-muted-foreground">Most attended venue</p>
          <p className="mt-1 text-lg font-semibold">{report.mostAttended.venueName}</p>
          <p className="text-sm text-muted-foreground">
            {report.mostAttended.visitCount} visits · {report.mostAttended.region}
          </p>
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Sparkles className="h-4 w-4" />}
          label="Hidden discovered"
          value={`${p.hiddenDiscovered}/${p.hiddenTotal}`}
        />
        <StatCard
          icon={<MapPin className="h-4 w-4" />}
          label="Seasonal venues"
          value={`${p.seasonalVisited}/${p.seasonalTotal}`}
        />
        <StatCard
          icon={<Medal className="h-4 w-4" />}
          label="Hall of Fame"
          value={`${p.hallOfFameVisited}/${p.hallOfFameTotal}`}
        />
      </div>

      <section>
        <h3 className="text-xl font-semibold">Visited venues</h3>
        {report.visits.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Check in at a venue concourse or attend an event to start your collection.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {report.visits.map((v) => (
              <li key={v.venueId}>
                <Link
                  href={`/livecircuit/venues/${v.venueSlug}`}
                  className="glass-panel block rounded-xl p-4 hover:border-primary/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{v.venueName}</p>
                      <p className="text-xs text-muted-foreground">
                        {v.region}
                        {v.stateCode ? ` · ${v.stateCode}` : ""}
                      </p>
                    </div>
                    {v.isFavorite ? <Heart className="h-4 w-4 fill-primary text-primary" /> : null}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{v.visitCount} visits</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {v.isHallOfFame ? <Badge variant="secondary">Hall of Fame</Badge> : null}
                    {v.isSeasonal ? <Badge variant="outline">Seasonal</Badge> : null}
                    {v.isHidden ? <Badge className="bg-amber-500/20 text-amber-200">Hidden</Badge> : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {report.badges.length > 0 ? (
        <section>
          <h3 className="text-xl font-semibold">Venue badges</h3>
          <ul className="mt-4 space-y-2">
            {report.badges.map((b) => (
              <li key={b.id} className="glass-panel rounded-lg px-4 py-3 text-sm">
                <span className="font-medium">{b.name}</span>
                {b.venueName ? <span className="text-muted-foreground"> · {b.venueName}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
