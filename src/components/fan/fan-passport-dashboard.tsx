"use client";

import { Award, MapPin, Route, Sparkles, Stamp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { FanPassportReport } from "@/lib/types/fan-passport";

function StampCard({
  stamp,
}: {
  stamp: FanPassportReport["stamps"][number];
}) {
  return (
    <li className="glass-panel relative overflow-hidden rounded-xl border border-primary/20 p-4 transition hover:border-primary/40">
      <div className="absolute -right-4 -top-4 size-16 rotate-12 rounded-full border-2 border-dashed border-primary/30 opacity-40" />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{stamp.eventTitle}</p>
          <p className="text-sm text-muted-foreground">{stamp.artistName ?? "Artist"}</p>
        </div>
        <Stamp className="h-5 w-5 shrink-0 text-primary" />
      </div>
      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        {stamp.venueName ? <p>{stamp.venueName}</p> : null}
        <p className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {[stamp.cityName, stamp.stateCode, stamp.countryName].filter(Boolean).join(", ") || "Virtual"}
        </p>
        <p>{new Date(stamp.attendedAt).toLocaleDateString()}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {stamp.isVip ? <Badge variant="secondary">VIP</Badge> : null}
        {stamp.tourTitle ? <Badge variant="outline">{stamp.tourTitle}</Badge> : null}
        {stamp.isSpecial ? <Badge className="bg-amber-500/20 text-amber-200">Special</Badge> : null}
      </div>
    </li>
  );
}

export function FanPassportDashboard({ report }: { report: FanPassportReport }) {
  const { progress } = report;

  return (
    <div className="space-y-8">
      <Card className="glass-panel overflow-hidden border-white/10">
        <div className="bg-gradient-to-br from-primary/25 via-transparent to-transparent p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-widest text-muted-foreground">LiveCircuit Fan Passport</p>
              <h2 className="mt-1 text-2xl font-bold">{report.displayName ?? "Your passport"}</h2>
              <p className="mt-2 font-mono text-sm text-primary">{report.passportNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold tabular-nums">{progress.stampCount}</p>
              <p className="text-sm text-muted-foreground">Stamps collected</p>
            </div>
          </div>
        </div>
        <CardContent className="grid gap-4 border-t border-white/10 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Countries</p>
            <p className="font-medium">
              {progress.distinctCountries} / {progress.countryTarget}
            </p>
            <Progress
              className="mt-2 h-2"
              value={(progress.distinctCountries / progress.countryTarget) * 100}
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">U.S. states</p>
            <p className="font-medium">
              {progress.distinctUsStates} / {progress.usStateTarget}
            </p>
            <Progress
              className="mt-2 h-2"
              value={(progress.distinctUsStates / progress.usStateTarget) * 100}
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cities visited</p>
            <p className="font-medium">
              {progress.distinctCities} / {progress.cityTarget}
            </p>
            <Progress
              className="mt-2 h-2"
              value={(progress.distinctCities / progress.cityTarget) * 100}
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tours completed</p>
            <p className="font-medium">{report.tourStats.toursCompleted}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {report.tourStats.completionPercent}% road warrior
            </p>
          </div>
        </CardContent>
      </Card>

      {report.tourStats.citiesVisited.length > 0 ? (
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Route className="h-5 w-5 text-primary" />
              Tour passport stamps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {report.tourStats.citiesVisited.map((city) => (
                <Badge key={city} variant="secondary" className="gap-1 px-3 py-1">
                  <MapPin className="size-3" />
                  {city}
                </Badge>
              ))}
            </div>
            {report.tourStats.statesVisited.length > 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                States: {report.tourStats.statesVisited.join(", ")}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">Collectible stamps</h3>
        </div>
        {report.stamps.length === 0 ? (
          <p className="glass-panel rounded-xl p-6 text-sm text-muted-foreground">
            Attend a show (check in or watch through the end) to earn your first stamp.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {report.stamps.map((stamp) => (
              <StampCard key={stamp.id} stamp={stamp} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">Achievements</h3>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {report.achievements.map((a) => (
            <li
              key={a.slug}
              className={`glass-panel rounded-xl p-4 ${a.earned ? "border border-primary/30" : "opacity-80"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
                </div>
                {a.earned ? (
                  <Badge className="shrink-0 bg-primary/20 text-primary">Earned</Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0">
                    {a.currentValue}/{a.targetValue}
                  </Badge>
                )}
              </div>
              {!a.earned ? (
                <Progress className="mt-3 h-2" value={(a.currentValue / a.targetValue) * 100} />
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
