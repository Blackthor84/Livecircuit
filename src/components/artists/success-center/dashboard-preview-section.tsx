"use client";

import { BarChart3, Calendar, MapPin, Star, TrendingUp, Trophy, Users } from "lucide-react";
import { useSuccessCenter } from "@/components/artists/success-center/success-center-context";
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { SectionHeader } from "@/components/artists/success-center/section-header";

export function DashboardPreviewSection() {
  const { activeAudience, venueMatch, report } = useSuccessCenter();
  const resetKey = String(activeAudience);

  const stats = [
    { label: "Followers", value: activeAudience, icon: Users, change: "+12%" },
    { label: "Upcoming Shows", value: 1, icon: Calendar, change: "Next month" },
    { label: "Revenue", value: report.estimatedRevenue, icon: TrendingUp, change: "Projected", prefix: "$" },
    { label: "Tickets Sold", value: Math.round(venueMatch.expectedAttendance * 0.6), icon: BarChart3, change: "60% sold" },
    { label: "Reviews", value: 4.8, icon: Star, change: "4.8 avg", decimal: true },
    { label: "Ranking", value: 847, icon: Trophy, change: "Top 15%" },
    { label: "Audience Growth", value: Math.round(activeAudience * 0.08), icon: TrendingUp, change: "+8% mo", prefix: "+" },
  ];

  const venueProgress = [
    { name: "Community Arena", pct: venueMatch.venue.id === "community" ? 85 : 100 },
    { name: "Club Arena", pct: ["club", "theater", "arena", "stadium"].includes(venueMatch.venue.id) ? 100 : 35 },
    { name: "Theater", pct: ["theater", "arena", "stadium"].includes(venueMatch.venue.id) ? 100 : 20 },
    { name: "Arena", pct: ["arena", "stadium"].includes(venueMatch.venue.id) ? 100 : 5 },
    { name: "Stadium", pct: venueMatch.venue.id === "stadium" ? 100 : 0 },
  ];

  return (
    <section id="dashboard-preview" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <SectionHeader eyebrow="Step 14" title="Artist Dashboard Preview"
          description="A glimpse of your future LiveCircuit artist dashboard." />

        <FadeUp>
          <div className="glass-panel overflow-hidden rounded-3xl">
            <div className="border-b border-white/10 px-6 py-4">
              <p className="text-sm font-semibold">Artist Dashboard</p>
              <p className="text-xs text-muted-foreground">Preview · demo data from your success plan</p>
            </div>

            <div className="grid gap-px bg-white/5 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-card/40 p-5">
                  <div className="flex items-center justify-between">
                    <stat.icon className="size-4 text-muted-foreground" />
                    <span className="text-xs text-emerald-400">{stat.change}</span>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold tabular-nums">
                    {stat.prefix ?? ""}
                    {stat.decimal ? stat.value : <AnimatedCounter value={stat.value} format="number" resetKey={resetKey} />}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-6">
              <p className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <MapPin className="size-4 text-primary" /> Venue Progress
              </p>
              <div className="space-y-3">
                {venueProgress.map((v) => (
                  <div key={v.name}>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{v.name}</span>
                      <span>{v.pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400 transition-all" style={{ width: `${v.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
