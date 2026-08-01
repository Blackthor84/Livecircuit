"use client";

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
import { AdminKpiGrid } from "@/components/admin/command-center/admin-kpi-grid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/format";
import type { AgencyDashboardStats } from "@/lib/agency/types";

export function AgencyDashboardPanel({ stats }: { stats: AgencyDashboardStats }) {
  const kpis = [
    { label: "Total artists", value: stats.totalArtists.toLocaleString() },
    { label: "Active artists", value: stats.activeArtists.toLocaleString() },
    { label: "Upcoming performances", value: stats.upcomingPerformances.toLocaleString() },
    { label: "Tickets sold", value: stats.ticketsSold.toLocaleString() },
    { label: "Gross revenue", value: formatCents(stats.grossRevenueCents) },
    { label: "Pending booking requests", value: stats.pendingBookingRequests.toLocaleString() },
    { label: "Upcoming sponsorships", value: stats.upcomingSponsorships.toLocaleString() },
    { label: "New followers", value: stats.newFollowers.toLocaleString() },
    { label: "Monthly revenue", value: formatCents(stats.monthlyRevenueCents) },
    {
      label: "Trending artists",
      value: stats.trendingArtists[0]?.stage_name ?? "—",
      hint: stats.trendingArtists.length > 1 ? `+${stats.trendingArtists.length - 1} more` : undefined,
    },
  ];

  return (
    <div className="space-y-8">
      <AdminKpiGrid kpis={kpis} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {stats.revenueTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => formatCents(Number(v ?? 0))} />
                  <Line type="monotone" dataKey="cents" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Revenue charts populate as your roster performs.</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle>Tickets</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {stats.ticketsTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.ticketsTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Ticket sales will appear here after your first show.</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle>Attendance / watch time</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {stats.attendanceTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="viewers" stroke="#a78bfa" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Peak viewers and watch time appear after live events.</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle>Revenue by artist</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.revenueByArtist.length ? (
              <ul className="space-y-2 text-sm">
                {stats.revenueByArtist.map((row) => (
                  <li key={row.name} className="flex justify-between gap-4">
                    <span>{row.name}</span>
                    <span className="tabular-nums text-muted-foreground">{formatCents(row.cents)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Per-artist revenue breakdowns appear as shows sell tickets.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
