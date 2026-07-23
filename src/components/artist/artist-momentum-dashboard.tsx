"use client";

import { ArrowDownRight, ArrowUpRight, Minus, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ArtistMomentumReport, MomentumFactors } from "@/lib/types/artist-momentum";

function TrendBadge({ trend, delta }: { trend: ArtistMomentumReport["trend"]; delta: number }) {
  if (trend === "up") {
    return (
      <Badge className="gap-1 bg-emerald-500/20 text-emerald-300">
        <ArrowUpRight className="h-3.5 w-3.5" />
        +{delta}
      </Badge>
    );
  }
  if (trend === "down") {
    return (
      <Badge className="gap-1 bg-rose-500/20 text-rose-300">
        <ArrowDownRight className="h-3.5 w-3.5" />
        {delta}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Minus className="h-3.5 w-3.5" />
      Stable
    </Badge>
  );
}

function factorEntries(factors: MomentumFactors, labels: ArtistMomentumReport["labels"]) {
  return (Object.keys(factors) as (keyof MomentumFactors)[]).map((key) => ({
    key,
    label: labels[key],
    value: factors[key],
  }));
}

export function ArtistMomentumSummary({
  report,
  compact,
}: {
  report: ArtistMomentumReport;
  compact?: boolean;
}) {
  return (
    <Card className="glass-panel border-white/10">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">LiveCircuit Score</CardTitle>
          <p className="text-sm text-muted-foreground">Artist momentum · 30-day signals</p>
        </div>
        <TrendingUp className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-4">
          <p className="text-5xl font-bold tabular-nums">{report.score}</p>
          <TrendBadge trend={report.trend} delta={report.trendDelta} />
        </div>
        {!compact && (
          <p className="mt-3 text-xs text-muted-foreground">
            Updated {new Date(report.computedAt).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function ArtistMomentumDashboard({ report }: { report: ArtistMomentumReport }) {
  const chartData = report.history.map((h) => ({
    date: h.date.slice(5),
    score: h.score,
  }));

  const factors = factorEntries(report.factors, report.labels).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-8">
      <ArtistMomentumSummary report={report} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="text-lg">Score history</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-white/10" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">
                History builds as daily snapshots are saved. Check back tomorrow for trends.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="text-lg">Factor breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {factors.map((f) => (
              <div key={f.key}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{f.label}</span>
                  <span className="tabular-nums text-muted-foreground">{f.value}</span>
                </div>
                <Progress value={f.value} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <ul className="glass-panel space-y-2 rounded-xl p-6 text-sm text-muted-foreground">
        <li>Scores blend revenue, growth, engagement, tickets, watch time, returns, cancellations, and reviews.</li>
        <li>Each factor is normalized to 0–100 and weighted into your LiveCircuit Score.</li>
        <li>Daily snapshots power trend arrows and the history chart.</li>
      </ul>
    </div>
  );
}
