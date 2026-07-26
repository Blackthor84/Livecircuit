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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminTrendPoint } from "@/lib/data/admin-command-center";

export function AdminTrendCharts({
  signupTrend,
  revenueTrend,
  engagementTrend,
}: {
  signupTrend: AdminTrendPoint[];
  revenueTrend: AdminTrendPoint[];
  engagementTrend: AdminTrendPoint[];
}) {
  if (!signupTrend.length) {
    return (
      <Card className="glass-panel border-white/10">
        <CardContent className="py-10 text-sm text-muted-foreground">
          Trend charts require Supabase connection and historical data.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Signups</CardTitle>
        </CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={signupTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="label" stroke="#888" />
              <YAxis stroke="#888" allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#1a1525", border: "1px solid #333" }} />
              <Line type="monotone" dataKey="value" stroke="#c084fc" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Revenue (USD)</CardTitle>
        </CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="label" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip contentStyle={{ background: "#1a1525", border: "1px solid #333" }} />
              <Bar dataKey="value" fill="#818cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Engagement proxy</CardTitle>
        </CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={engagementTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="label" stroke="#888" />
              <YAxis stroke="#888" allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#1a1525", border: "1px solid #333" }} />
              <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
