"use client";

import {
  Area,
  AreaChart,
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
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import { ANALYTICS_CHART_DATA, DASHBOARD_METRICS } from "@/lib/demo/naming-rights-data";
import type { BrandTheme } from "@/lib/demo/naming-rights-utils";

const CHARTS = [
  { title: "Monthly visitors", data: ANALYTICS_CHART_DATA.monthlyReach, type: "area" as const },
  { title: "Brand impressions", data: ANALYTICS_CHART_DATA.brandImpressions, type: "line" as const },
  { title: "Ticket sales", data: ANALYTICS_CHART_DATA.ticketSales, type: "bar" as const },
  { title: "Ad clicks", data: ANALYTICS_CHART_DATA.adClicks, type: "bar" as const },
  { title: "Average attendance", data: ANALYTICS_CHART_DATA.avgAttendance, type: "area" as const },
  { title: "Live viewers", data: ANALYTICS_CHART_DATA.liveViewers, type: "line" as const },
];

export function InteractiveAnalyticsDashboard({
  theme,
  resetKey,
  metrics = DASHBOARD_METRICS,
}: {
  theme: BrandTheme;
  resetKey: string;
  metrics?: typeof DASHBOARD_METRICS;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <div key={m.label} className="glass-panel rounded-xl p-5 transition hover:border-amber-500/20">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{m.label}</p>
            <p className="mt-2 text-3xl font-bold">
              <AnimatedCounter value={m.value} format={m.format} resetKey={resetKey} />
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CHARTS.map((chart) => (
          <div key={chart.title} className="glass-panel rounded-xl p-5">
            <h4 className="text-sm font-semibold">{chart.title}</h4>
            <div className="mt-3 h-40">
              <ResponsiveContainer width="100%" height="100%">
                {chart.type === "area" ? (
                  <AreaChart data={[...chart.data]}>
                    <defs>
                      <linearGradient id={`grad-${chart.title}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={theme.primary} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={theme.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" stroke="#666" fontSize={10} />
                    <YAxis stroke="#666" fontSize={10} />
                    <Tooltip contentStyle={{ background: "oklch(0.14 0.025 280)", border: "1px solid rgba(255,255,255,0.1)" }} />
                    <Area type="monotone" dataKey="value" stroke={theme.primary} fill={`url(#grad-${chart.title})`} strokeWidth={2} />
                  </AreaChart>
                ) : chart.type === "bar" ? (
                  <BarChart data={[...chart.data]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" stroke="#666" fontSize={10} />
                    <YAxis stroke="#666" fontSize={10} />
                    <Tooltip contentStyle={{ background: "oklch(0.14 0.025 280)", border: "1px solid rgba(255,255,255,0.1)" }} />
                    <Bar dataKey="value" fill={theme.gold} radius={[3, 3, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={[...chart.data]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" stroke="#666" fontSize={10} />
                    <YAxis stroke="#666" fontSize={10} />
                    <Tooltip contentStyle={{ background: "oklch(0.14 0.025 280)", border: "1px solid rgba(255,255,255,0.1)" }} />
                    <Line type="monotone" dataKey="value" stroke={theme.primary} strokeWidth={2} dot={false} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
