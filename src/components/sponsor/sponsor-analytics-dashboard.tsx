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
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exportSponsorAnalyticsCsvAction } from "@/lib/actions/sponsor-analytics";
import type { SponsorAnalyticsReport } from "@/lib/data/sponsor-analytics";
import { formatCents } from "@/lib/format";

export function SponsorAnalyticsDashboard({
  report,
  organizationId,
}: {
  report: SponsorAnalyticsReport;
  organizationId: string;
}) {
  const stats = [
    { label: "Impressions", value: report.summary.impressions.toLocaleString() },
    { label: "Clicks", value: report.summary.clicks.toLocaleString() },
    {
      label: "CTR",
      value: `${(report.summary.ctr * 100).toFixed(2)}%`,
    },
    { label: "Unique visitors", value: report.summary.uniqueVisitors.toLocaleString() },
    { label: "Coupon redemptions", value: report.summary.couponDownloads.toLocaleString() },
    {
      label: "Revenue attribution",
      value: formatCents(report.summary.revenueAttributionCents),
    },
  ];

  async function exportCsv() {
    const result = await exportSponsorAnalyticsCsvAction({
      organizationId,
      periodDays: report.periodDays,
    });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  }

  const chartData =
    report.daily.length > 0
      ? report.daily
      : [{ date: "—", impressions: 0, clicks: 0, conversions: 0, couponDownloads: 0 }];

  const geoEntries = Object.entries(report.geoDistribution).slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Last {report.periodDays} days</p>
        <Button type="button" variant="secondary" size="sm" onClick={() => void exportCsv()}>
          Export CSV
        </Button>
      </div>

      {(report.growth.impressionsDeltaPct != null || report.growth.clicksDeltaPct != null) && (
        <p className="text-sm text-muted-foreground">
          Growth (2nd half vs 1st half of period):{" "}
          {report.growth.impressionsDeltaPct != null
            ? `impressions ${report.growth.impressionsDeltaPct > 0 ? "+" : ""}${report.growth.impressionsDeltaPct}%`
            : ""}
          {report.growth.clicksDeltaPct != null
            ? ` · clicks ${report.growth.clicksDeltaPct > 0 ? "+" : ""}${report.growth.clicksDeltaPct}%`
            : ""}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="glass-panel border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold tabular-nums">{stat.value}</CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle>Impressions & clicks</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" stroke="#888" tick={{ fontSize: 11 }} />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ background: "#1a1525", border: "1px solid #333" }} />
                <Line type="monotone" dataKey="impressions" stroke="#c084fc" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="clicks" stroke="#34d399" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle>By campaign</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.byCampaign.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" stroke="#888" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ background: "#1a1525", border: "1px solid #333" }} />
                <Bar dataKey="impressions" fill="#c084fc" radius={[4, 4, 0, 0]} />
                <Bar dataKey="clicks" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle>Geographic distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {geoEntries.length ? (
              <ul className="space-y-2 text-sm">
                {geoEntries.map(([region, count]) => (
                  <li key={region} className="flex justify-between">
                    <span>{region}</span>
                    <span className="tabular-nums text-muted-foreground">{count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Geo data populates from daily rollups as campaigns run across venues.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle>Top performances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="font-medium">Events</p>
              {report.topEvents.length ? (
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {report.topEvents.map((e) => (
                    <li key={e.id}>{e.title}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-muted-foreground">No event attribution yet.</p>
              )}
            </div>
            <div>
              <p className="font-medium">Artists</p>
              {report.topArtists.length ? (
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {report.topArtists.map((a) => (
                    <li key={a.id}>{a.stage_name}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-muted-foreground">No artist attribution yet.</p>
              )}
            </div>
            {report.summary.avgSessionSeconds > 0 ? (
              <p>Avg session length: {Math.round(report.summary.avgSessionSeconds / 60)} min</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
