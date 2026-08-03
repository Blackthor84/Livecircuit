"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  Calendar,
  DollarSign,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { DemoChartPanel } from "@/components/demo/interactive/shared/demo-chart-panel";
import { DemoMetricCard } from "@/components/demo/interactive/shared/demo-metric-card";
import {
  AI_RECOMMENDATIONS,
  DEMO_AGENCY_ARTISTS,
  DEMO_AGENCY_STATS,
  REVENUE_CHART,
} from "@/lib/demo/interactive/data";
import { cn } from "@/lib/utils";

export function AgencyDemoExperience() {
  const [selectedArtistId, setSelectedArtistId] = useState(DEMO_AGENCY_ARTISTS[0]!.id);
  const selected = DEMO_AGENCY_ARTISTS.find((a) => a.id === selectedArtistId)!;
  const aiRec = AI_RECOMMENDATIONS.find((r) => r.artist === selected.name) ?? AI_RECOMMENDATIONS[0]!;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Agency Command Center</h1>
        <p className="mt-2 text-muted-foreground">Manage your roster, bookings, and revenue at scale.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DemoMetricCard label="Total Artists" value={DEMO_AGENCY_STATS.totalArtists} icon={Users} format="number" trend={8.2} resetKey="agency" />
        <DemoMetricCard label="Revenue" value={DEMO_AGENCY_STATS.revenue} prefix="$" icon={DollarSign} trend={24.5} resetKey="agency" />
        <DemoMetricCard label="Ticket Sales" value={DEMO_AGENCY_STATS.ticketSales} icon={Ticket} trend={18.3} resetKey="agency" />
        <DemoMetricCard label="Fan Growth" value={Math.round(DEMO_AGENCY_STATS.fanGrowth * 100)} suffix="%" icon={TrendingUp} format="number" resetKey="agency" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DemoMetricCard label="Upcoming Shows" value={DEMO_AGENCY_STATS.upcomingPerformances} icon={Calendar} format="number" resetKey="agency2" />
        <DemoMetricCard label="Attendance" value={DEMO_AGENCY_STATS.attendance} icon={Users} resetKey="agency2" />
        <DemoMetricCard label="Merch Revenue" value={DEMO_AGENCY_STATS.merchRevenue} prefix="$" icon={Briefcase} resetKey="agency2" />
        <DemoMetricCard label="Sponsor Revenue" value={DEMO_AGENCY_STATS.sponsorRevenue} prefix="$" icon={Sparkles} resetKey="agency2" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass-panel rounded-2xl p-5 lg:col-span-1">
          <h3 className="font-semibold">Your Roster</h3>
          <div className="mt-4 space-y-2">
            {DEMO_AGENCY_ARTISTS.map((artist) => (
              <button
                key={artist.id}
                type="button"
                onClick={() => setSelectedArtistId(artist.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl p-3 text-left transition",
                  selectedArtistId === artist.id ? "bg-primary/15 border border-primary/30" : "hover:bg-white/[0.03]"
                )}
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-xs font-bold">{artist.avatar}</div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{artist.name}</p>
                  <p className="text-xs text-muted-foreground">{artist.genre}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <motion.div layout className="glass-panel rounded-2xl p-6">
            <h3 className="text-lg font-bold">{selected.name}</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div><p className="text-xs text-muted-foreground">Revenue</p><p className="text-xl font-bold">${selected.revenue.toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground">Followers</p><p className="text-xl font-bold">{selected.followers.toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground">States</p><p className="text-xl font-bold">{selected.statesReached}</p></div>
            </div>
          </motion.div>

          <FadeUp>
            <div className="glass-panel rounded-2xl border border-primary/20 bg-primary/5 p-6">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">AI Recommendation</p>
                  <p className="mt-2 font-semibold">{aiRec.insight}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{aiRec.detail}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{aiRec.confidence}% confidence</p>
                </div>
              </div>
            </div>
          </FadeUp>

          <DemoChartPanel title="Revenue History" data={REVENUE_CHART} dataKey="revenue" type="area" />
        </div>
      </div>
    </div>
  );
}
