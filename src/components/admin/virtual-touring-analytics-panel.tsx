"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VirtualTouringAnalyticsSummary } from "@/lib/virtual-touring/types";

export function VirtualTouringAnalyticsPanel({ data }: { data: VirtualTouringAnalyticsSummary }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Virtual Touring Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Attendance by city, local vs remote viewers, and passport completion.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass-panel border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Local viewers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{data.localVsRemote.local.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="glass-panel border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remote viewers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{data.localVsRemote.remote.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="glass-panel border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Passport completion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{data.passportCompletionRate}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="text-base">Attendance by city</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.attendanceByCity.map((row) => (
              <div key={`${row.city}-${row.stateCode}`} className="flex items-center justify-between text-sm">
                <span>
                  {row.city}
                  {row.stateCode ? `, ${row.stateCode}` : ""}
                </span>
                <Badge variant="secondary">{row.viewers.toLocaleString()}</Badge>
              </div>
            ))}
            {!data.attendanceByCity.length ? (
              <p className="text-sm text-muted-foreground">No city rollups yet.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="text-base">Most loyal touring fans</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.topLoyalFans.map((fan) => (
              <div key={fan.userId} className="flex items-center justify-between text-sm">
                <span>{fan.displayName ?? "Fan"}</span>
                <Badge>{fan.stampCount} stops</Badge>
              </div>
            ))}
            {!data.topLoyalFans.length ? (
              <p className="text-sm text-muted-foreground">No passport data yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
