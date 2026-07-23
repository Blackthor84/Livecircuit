"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles, MapPin, TrendingUp, AlertTriangle, DollarSign, Users } from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FanHeatMapExplorer, FanHeatTopLocations } from "@/components/maps/fan-heat-map-explorer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  applyOptimizedTourPlanAction,
  generateTourPlanAction,
} from "@/lib/actions/tour-planner";
import type { TourPlannerReport } from "@/lib/types/tour-planner";
import { formatCents } from "@/lib/format";

export function TourPlannerDashboard({
  initialPlan,
  artistId,
  artistSlug,
}: {
  initialPlan: TourPlannerReport;
  artistId: string;
  artistSlug: string;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);
  const [refreshing, setRefreshing] = useState(false);
  const [building, setBuilding] = useState(false);

  async function refreshPlan() {
    setRefreshing(true);
    const result = await generateTourPlanAction();
    setRefreshing(false);
    if (!result.ok) toast.error(result.error);
    else if (result.plan) {
      setPlan(result.plan);
      toast.success("Tour plan updated");
      router.refresh();
    }
  }

  async function buildTour() {
    setBuilding(true);
    const result = await applyOptimizedTourPlanAction({ maxStops: 5 });
    setBuilding(false);
    if (!result.ok) toast.error(result.error);
    else if (result.tourId) {
      toast.success("Draft tour created");
      router.push(`/artist/tours/${result.tourId}`);
    }
  }

  const summaryCards = [
    {
      label: "Revenue prediction",
      value: formatCents(plan.summary.totalRevenuePredictionCents),
      icon: DollarSign,
    },
    {
      label: "Expected attendance",
      value: plan.summary.totalExpectedAttendance.toLocaleString(),
      icon: Users,
    },
    {
      label: "Avg risk score",
      value: `${plan.summary.averageRiskScore}/100`,
      icon: AlertTriangle,
    },
    {
      label: "Growth opportunity",
      value: `${plan.summary.averageGrowthOpportunityPct}%`,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="secondary" className="mb-2 gap-1">
            <Sparkles className="size-3.5" />
            AI Tour Planner
          </Badge>
          <p className="text-sm text-muted-foreground">
            Built from fan locations, ticket sales, tips, watch time, merch, growth, and schedule patterns.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={refreshing} onClick={() => void refreshPlan()}>
            {refreshing ? "Analyzing…" : "Refresh analysis"}
          </Button>
          <Button type="button" disabled={building || !plan.recommendations.length} onClick={() => void buildTour()}>
            {building ? "Building tour…" : "Build optimized tour"}
          </Button>
        </div>
      </div>

      <ul className="glass-panel space-y-2 rounded-xl p-6 text-sm">
        {plan.insights.map((line) => (
          <li key={line} className="text-muted-foreground">
            {line}
          </li>
        ))}
      </ul>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((c) => (
          <Card key={c.label} className="glass-panel border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
                <c.icon className="size-4 text-primary" />
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold tabular-nums">{c.value}</CardContent>
          </Card>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Preferred window: <span className="text-foreground">{plan.summary.preferredTimeWindow}</span>
        {plan.summary.strongestGenreSignal ? (
          <>
            {" "}
            · Genre signal: <span className="capitalize text-foreground">{plan.summary.strongestGenreSignal}</span>
          </>
        ) : null}
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-panel border-white/10 lg:col-span-2">
          <CardHeader>
            <CardTitle>Tour heat map</CardTitle>
          </CardHeader>
          <CardContent>
            <FanHeatMapExplorer artistId={artistId} initial={plan.heatMap} />
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle>Day-of-week demand</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={plan.scheduling.byDayOfWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip contentStyle={{ background: "#1a1525", border: "1px solid #333" }} />
                <Bar dataKey="score" fill="#c084fc" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle>Top fan regions</CardTitle>
          </CardHeader>
          <CardContent>
            <FanHeatTopLocations locations={plan.heatMap.topLocations} />
          </CardContent>
        </Card>
      </div>

      <section>
        <h2 className="text-lg font-semibold">City recommendations</h2>
        <ul className="mt-4 space-y-4">
          {plan.recommendations.map((rec) => (
            <li key={rec.cityLabel} className="glass-panel rounded-xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-lg font-medium">
                    <MapPin className="size-4 text-primary" />
                    {rec.cityLabel}
                    {rec.stateCode ? `, ${rec.stateCode}` : ""}
                  </p>
                  {rec.venueSlug ? (
                    <p className="mt-1 text-xs text-primary">Venue: {rec.venueSlug}</p>
                  ) : null}
                </div>
                <Badge variant="secondary">Fan score {rec.fanScore}</Badge>
              </div>
              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <span>Revenue est. {formatCents(rec.revenuePredictionCents)}</span>
                <span>Attendance ~{rec.expectedAttendance}</span>
                <span>Risk {rec.riskScore}/100</span>
                <span>Profit est. {formatCents(rec.profitEstimateCents)}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {rec.suggestedDayOfWeek} · {rec.suggestedHourLocal}:00 local · Growth +{rec.growthOpportunityPct}%
                {rec.travelScore == null ? " · Travel score: coming soon" : ""}
              </p>
              <ul className="mt-3 list-disc pl-5 text-xs text-muted-foreground">
                {rec.rationale.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
