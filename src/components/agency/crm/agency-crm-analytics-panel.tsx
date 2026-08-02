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
import type { CrmAnalyticsPayload } from "@/lib/agency/crm-types";
import { formatCents } from "@/lib/format";

export function AgencyCrmAnalyticsPanel({ data }: { data: CrmAnalyticsPayload }) {
  const kpis = [
    { label: "Agency revenue", value: formatCents(data.agencyRevenueCents) },
    { label: "Conversion rate", value: `${data.conversionRate}%` },
    { label: "Avg ticket price", value: formatCents(data.avgTicketPriceCents) },
    { label: "Sponsor revenue", value: formatCents(data.sponsorRevenueCents) },
    { label: "Repeat customers", value: data.repeatCustomers.toLocaleString() },
  ];

  return (
    <div className="space-y-8">
      <AdminKpiGrid kpis={kpis} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="glass-panel border-white/10">
          <CardHeader><CardTitle>Growth Trends</CardTitle></CardHeader>
          <CardContent className="h-72">
            {data.growthTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.growthTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v, name) => name === "revenueCents" ? formatCents(Number(v ?? 0)) : v} />
                  <Line type="monotone" dataKey="revenueCents" stroke="hsl(var(--primary))" strokeWidth={2} name="Revenue" />
                  <Line type="monotone" dataKey="bookings" stroke="#a78bfa" strokeWidth={2} name="Bookings" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Analytics populate as bookings progress through your pipeline.</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader><CardTitle>Revenue by Artist</CardTitle></CardHeader>
          <CardContent className="h-72">
            {data.revenueByArtist.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.revenueByArtist} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatCents(Number(v ?? 0))} />
                  <Bar dataKey="cents" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Per-artist revenue appears after completed events.</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10 xl:col-span-2">
          <CardHeader><CardTitle>Revenue by Event</CardTitle></CardHeader>
          <CardContent>
            {data.revenueByEvent.length ? (
              <ul className="space-y-2">
                {data.revenueByEvent.map((row) => (
                  <li key={row.title} className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2 text-sm">
                    <span>{row.title}</span>
                    <span className="tabular-nums text-muted-foreground">{formatCents(row.cents)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Event-level revenue tracking activates when payments are recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
