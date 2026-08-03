"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronRight,
  DollarSign,
  FileText,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";
import { DemoChartPanel } from "@/components/demo/interactive/shared/demo-chart-panel";
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import {
  AI_RECOMMENDATIONS,
  DEMO_AGENCY_ARTISTS,
  DEMO_AGENCY_STATS,
  DEMO_ARTIST_PROFILES,
  REVENUE_CHART,
} from "@/lib/demo/interactive/data";
import { cn } from "@/lib/utils";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ProfileTab = "overview" | "tours" | "contracts" | "sponsors" | "demographics";

const CHART_COLORS = ["oklch(0.62 0.22 280)", "oklch(0.65 0.16 165)", "oklch(0.72 0.18 55)", "oklch(0.58 0.2 220)"];

export function AgencyDemoExperience() {
  const [selectedId, setSelectedId] = useState(DEMO_AGENCY_ARTISTS[0]!.id);
  const [profileTab, setProfileTab] = useState<ProfileTab>("overview");
  const selected = DEMO_AGENCY_ARTISTS.find((a) => a.id === selectedId)!;
  const profile = DEMO_ARTIST_PROFILES[selectedId] ?? DEMO_ARTIST_PROFILES["artist-1"]!;
  const aiRec = AI_RECOMMENDATIONS.find((r) => r.artist === selected.name) ?? AI_RECOMMENDATIONS[0]!;

  const tabs: { id: ProfileTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "tours", label: "Tours" },
    { id: "contracts", label: "Contracts" },
    { id: "sponsors", label: "Sponsors" },
    { id: "demographics", label: "Demographics" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <AgencyMetric label="Artists" value={DEMO_AGENCY_STATS.totalArtists} icon={Users} />
        <AgencyMetric label="Revenue" value={DEMO_AGENCY_STATS.revenue} prefix="$" format="compact" icon={DollarSign} />
        <AgencyMetric label="Shows This Month" value={DEMO_AGENCY_STATS.showsThisMonth} icon={Calendar} />
        <AgencyMetric label="Upcoming Tours" value={DEMO_AGENCY_STATS.upcomingTours} icon={Ticket} />
        <AgencyMetric label="Fan Growth" value={DEMO_AGENCY_STATS.fanGrowth} suffix="%" icon={TrendingUp} trend />
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <div className="rounded-2xl border border-white/10 bg-black/30">
            <div className="border-b border-white/10 px-4 py-3">
              <p className="text-sm font-semibold">Roster</p>
              <p className="text-xs text-muted-foreground">{DEMO_AGENCY_ARTISTS.length} artists shown · click to inspect</p>
            </div>
            <div className="max-h-[420px] overflow-y-auto p-2">
              {DEMO_AGENCY_ARTISTS.map((artist) => (
                <motion.button
                  key={artist.id}
                  type="button"
                  onClick={() => { setSelectedId(artist.id); setProfileTab("overview"); }}
                  whileHover={{ x: 4 }}
                  className={cn(
                    "mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left transition",
                    selectedId === artist.id ? "border border-primary/40 bg-primary/10" : "hover:bg-white/[0.04]"
                  )}
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-bold">
                    {artist.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{artist.name}</p>
                    <p className="text-xs text-muted-foreground">{artist.genre}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-400">${(artist.revenue / 1000).toFixed(0)}K</p>
                    <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6 xl:col-span-8">
          <motion.div layout className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 text-lg font-bold">
                  {selected.avatar}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selected.name}</h2>
                  <p className="text-sm text-muted-foreground">{selected.genre} · {selected.statesReached} states</p>
                </div>
              </div>
              <div className="flex gap-6 text-right">
                <div><p className="text-xs text-muted-foreground">Revenue</p><p className="text-xl font-bold">${selected.revenue.toLocaleString()}</p></div>
                <div><p className="text-xs text-muted-foreground">Followers</p><p className="text-xl font-bold">{selected.followers.toLocaleString()}</p></div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-1 border-b border-white/10 pb-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setProfileTab(tab.id)}
                  className={cn(
                    "rounded-t-lg px-4 py-2 text-sm font-medium transition",
                    profileTab === tab.id ? "border-b-2 border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${selectedId}-${profileTab}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-6"
              >
                {profileTab === "overview" && (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="h-56">
                      <p className="mb-2 text-sm font-semibold">Revenue History</p>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={profile.revenueHistory}>
                          <XAxis dataKey="month" tick={{ fill: "oklch(0.65 0.02 280)", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "oklch(0.65 0.02 280)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                          <Tooltip contentStyle={{ background: "oklch(0.15 0.02 280)", border: "1px solid oklch(0.3 0.02 280)", borderRadius: 8 }} />
                          <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                            {profile.revenueHistory.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="h-56">
                      <p className="mb-2 text-sm font-semibold">Audience Growth</p>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={profile.audienceGrowth}>
                          <XAxis dataKey="month" tick={{ fill: "oklch(0.65 0.02 280)", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "oklch(0.65 0.02 280)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                          <Bar dataKey="followers" fill="oklch(0.62 0.22 280)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {profileTab === "tours" && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Upcoming Tours & Bookings</p>
                    {profile.upcomingTours.map((t) => (
                      <motion.div key={t.city} whileHover={{ x: 4 }} className="flex items-center justify-between rounded-xl border border-white/10 p-4">
                        <div>
                          <p className="font-semibold">{t.city}</p>
                          <p className="text-sm text-muted-foreground">{t.venue}</p>
                        </div>
                        <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">{t.date}</span>
                      </motion.div>
                    ))}
                    {profile.bookings.map((b) => (
                      <div key={b.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-4 py-3 text-sm">
                        <span>{b.city} · {b.date}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", b.status === "Confirmed" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400")}>{b.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {profileTab === "contracts" && (
                  <div className="space-y-3">
                    {profile.contracts.map((c) => (
                      <motion.div key={c.id} whileHover={{ scale: 1.01 }} className="flex items-center gap-3 rounded-xl border border-white/10 p-4">
                        <FileText className="size-5 text-primary" />
                        <div className="flex-1">
                          <p className="font-semibold">{c.venue}</p>
                          <p className="text-xs text-muted-foreground">{c.date}</p>
                        </div>
                        <p className="font-bold">${c.fee.toLocaleString()}</p>
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">{c.status}</span>
                      </motion.div>
                    ))}
                  </div>
                )}

                {profileTab === "sponsors" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {profile.sponsorDeals.map((s) => (
                      <motion.div key={s.id} whileHover={{ y: -4 }} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                        <Sparkles className="size-5 text-amber-400" />
                        <p className="mt-2 text-lg font-bold">{s.brand}</p>
                        <p className="text-2xl font-bold text-emerald-400">${s.value.toLocaleString()}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Expires {s.expires}</p>
                      </motion.div>
                    ))}
                  </div>
                )}

                {profileTab === "demographics" && (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={profile.demographics} dataKey="pct" nameKey="label" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                            {profile.demographics.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ background: "oklch(0.15 0.02 280)", border: "1px solid oklch(0.3 0.02 280)", borderRadius: 8 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                      {profile.demographics.map((d, i) => (
                        <div key={d.label} className="flex items-center gap-3">
                          <div className="size-3 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="flex-1 text-sm">{d.label}</span>
                          <span className="font-bold">{d.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          <motion.div
            whileHover={{ borderColor: "oklch(0.62 0.22 280 / 0.5)" }}
            className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 p-6"
          >
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                <Sparkles className="size-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-primary">AI Insights</p>
                <p className="mt-2 text-lg font-semibold">{aiRec.insight}</p>
                <p className="mt-1 text-sm text-muted-foreground">{aiRec.detail}</p>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <div className="rounded-xl bg-black/30 px-4 py-2">
                    <p className="text-xs text-muted-foreground">Projected revenue</p>
                    <p className="text-xl font-bold text-emerald-400">${aiRec.projectedRevenue.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl bg-black/30 px-4 py-2">
                    <p className="text-xs text-muted-foreground">Confidence</p>
                    <p className="text-xl font-bold">{aiRec.confidence}%</p>
                  </div>
                  <button type="button" className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
                    Apply Recommendation
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DemoChartPanel title="Agency Revenue Trend" data={REVENUE_CHART} dataKey="revenue" type="area" />
            <DemoChartPanel title="Ticket Volume" data={REVENUE_CHART} dataKey="attendance" type="line" color="oklch(0.65 0.16 165)" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AgencyMetric({
  label,
  value,
  prefix = "",
  suffix = "",
  format = "number" as "number" | "compact",
  icon: Icon,
  trend,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  format?: "number" | "compact";
  icon: typeof Users;
  trend?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.02 }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="size-4 text-primary/60" />
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl">
        {prefix}
        <AnimatedCounter value={value} format={format} resetKey={`agency-${label}`} />
        {suffix}
      </p>
      {trend ? <p className="mt-1 text-xs font-medium text-emerald-400">+{value}% vs last quarter</p> : null}
    </motion.div>
  );
}
