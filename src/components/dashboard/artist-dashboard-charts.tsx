"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FanHeatMapExplorer, FanHeatTopLocations } from "@/components/maps/fan-heat-map-explorer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ArtistDashboardAnalytics } from "@/lib/data/artist-analytics";

export function ArtistDashboardCharts({
  data,
  artistSlug,
  artistId,
}: {
  data: ArtistDashboardAnalytics;
  artistSlug: string;
  artistId: string;
}) {
  const stats = [
    { label: "Revenue (30d)", value: data.summary.revenue30dLabel },
    { label: "Tickets sold (30d)", value: data.summary.tickets30dLabel },
    { label: "Tips (30d)", value: data.summary.tips30dLabel },
    { label: "VIP members", value: data.summary.vipMembersLabel },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label} className="glass-panel border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{stat.value}</CardContent>
          </Card>
        ))}
        <Card className="glass-panel border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Followers</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data.summary.followersLabel}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle>Revenue growth</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="month" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip
                  contentStyle={{ background: "#1a1525", border: "1px solid #333" }}
                  formatter={(value) => [`$${value}`, "Revenue"]}
                />
                <Line type="monotone" dataKey="revenue" stroke="#c084fc" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle>Tickets by month</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="month" stroke="#888" />
                <YAxis stroke="#888" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#1a1525", border: "1px solid #333" }} />
                <Bar dataKey="tickets" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass-panel border-white/10 lg:col-span-2">
          <CardHeader>
            <CardTitle>Fan heat map</CardTitle>
          </CardHeader>
          <CardContent>
            <FanHeatMapExplorer artistId={artistId} initial={data.fanHeat} />
          </CardContent>
        </Card>
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle>Top locations</CardTitle>
          </CardHeader>
          <CardContent>
            <FanHeatTopLocations locations={data.fanHeat.topLocations} />
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Upcoming performances</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No scheduled stops —{" "}
              <Link href="/artist/tours/new" className="text-primary hover:underline">
                create a tour
              </Link>
              .
            </p>
          ) : (
            data.upcomingEvents.map((ev) => (
              <Link
                key={ev.id}
                href={`/artists/${artistSlug}/events/${ev.slug}`}
                className="flex flex-col justify-between gap-1 rounded-lg border border-white/10 px-4 py-3 text-sm transition hover:border-primary/30 sm:flex-row sm:items-center"
              >
                <span className="font-medium">{ev.title}</span>
                <span className="text-muted-foreground">
                  {ev.location} · {new Date(ev.scheduledAt).toLocaleString()}
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
