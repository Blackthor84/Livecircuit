"use client";

import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Brain, Lightbulb, TrendingUp, Users } from "lucide-react";
import { AdminKpiGrid } from "@/components/admin/command-center/admin-kpi-grid";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AgencyIntelligencePayload } from "@/lib/agency/business-os-types";
import { formatCents } from "@/lib/format";

function scoreColor(score: number) {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-amber-300";
  return "text-muted-foreground";
}

export function AgencyOsIntelligencePanel({ data }: { data: AgencyIntelligencePayload }) {
  const avgHealth = data.artists.length ? Math.round(data.artists.reduce((s, a) => s + a.health_score, 0) / data.artists.length) : 0;
  const avgFanGrowth = data.artists.length ? Math.round(data.artists.reduce((s, a) => s + a.fan_growth_score, 0) / data.artists.length) : 0;
  const topRising = data.artists[0]?.rising_star_score ?? 0;

  const kpis = [
    { label: "Roster health", value: `${avgHealth}/100` },
    { label: "Avg fan growth score", value: `${avgFanGrowth}/100` },
    { label: "Top rising star", value: `${topRising}/100` },
    { label: "Collaboration matches", value: String(data.collaborations.length) },
  ];

  return (
    <Tabs defaultValue="talent" className="space-y-6">
      <TabsList className="flex h-auto flex-wrap gap-1 bg-transparent p-0">
        {["talent", "health", "collaborations", "forecasts"].map((t) => (
          <TabsTrigger key={t} value={t} className="capitalize data-[state=active]:bg-primary/15 data-[state=active]:text-primary">{t}</TabsTrigger>
        ))}
      </TabsList>

      <AdminKpiGrid kpis={kpis} />

      <TabsContent value="talent" className="grid gap-4 lg:grid-cols-2">
        {data.artists.length ? data.artists.map((a) => (
          <Card key={a.artist_id} className="glass-panel border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2"><TrendingUp className="size-5" /> {a.stage_name}</span>
                <Badge>Rising {a.rising_star_score}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <ScoreBlock label="Fan growth" value={a.fan_growth_score} />
                <ScoreBlock label="Health" value={a.health_score} />
                <ScoreBlock label="Engagement" value={a.metrics.engagement} />
              </div>
              <div>
                <p className="mb-2 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground"><Lightbulb className="size-3.5" /> Recommendations</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {a.recommendations.map((r) => <li key={r}>• {r}</li>)}
                </ul>
              </div>
            </CardContent>
          </Card>
        )) : (
          <p className="text-sm text-muted-foreground lg:col-span-2">Add artists to your roster to unlock AI talent insights.</p>
        )}
      </TabsContent>

      <TabsContent value="health" className="space-y-4">
        {data.artists.map((a) => (
          <Card key={a.artist_id} className="glass-panel border-white/10">
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-semibold">{a.stage_name}</p>
                <span className={`text-2xl font-bold tabular-nums ${scoreColor(a.health_score)}`}>{a.health_score}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                {Object.entries(a.health).map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-white/5 px-3 py-2">
                    <p className="text-xs capitalize text-muted-foreground">{k.replace(/([A-Z])/g, " $1")}</p>
                    <p className="font-medium tabular-nums">{typeof v === "number" && v <= 100 ? `${v}%` : v}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="collaborations" className="space-y-4">
        <Card className="glass-panel border-white/10">
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-5" /> AI collaboration engine</CardTitle></CardHeader>
          <CardContent>
            {data.collaborations.length ? (
              <ul className="space-y-3 text-sm">
                {data.collaborations.map((c, i) => (
                  <li key={i} className="rounded-lg border border-white/5 px-4 py-3">
                    <div className="flex justify-between">
                      <span className="font-medium">{c.artist_a} × {c.artist_b}</span>
                      <Badge variant="secondary">{c.score}% match</Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">{c.reason}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Collaboration suggestions appear when you have multiple roster artists.</p>}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="forecasts" className="space-y-6">
        <Card className="glass-panel border-white/10">
          <CardHeader><CardTitle className="flex items-center gap-2"><Brain className="size-5" /> Revenue & attendance forecasts</CardTitle></CardHeader>
          <CardContent className="h-64">
            {data.forecasts.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.forecasts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="period_label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v, _n, p) => {
                    const row = p.payload as { forecast_type?: string };
                    return row.forecast_type === "attendance" ? `${v} fans` : formatCents(Number(v ?? 0));
                  }} />
                  <Bar dataKey="projected_cents" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-3">
          {data.forecasts.map((f) => (
            <Card key={f.period_label} className="glass-panel border-white/10">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">{f.period_label}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {f.forecast_type === "attendance" ? `${f.projected_cents.toLocaleString()} fans` : formatCents(f.projected_cents)}
                </p>
                {f.risk_level ? <Badge variant="outline" className="mt-2 capitalize">Risk: {f.risk_level}</Badge> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}

function ScoreBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/5 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${scoreColor(value)}`}>{value}</p>
    </div>
  );
}
