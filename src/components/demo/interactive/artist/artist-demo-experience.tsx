"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  DollarSign,
  MapPin,
  MessageSquare,
  Music,
  ShoppingBag,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import { DemoChartPanel } from "@/components/demo/interactive/shared/demo-chart-panel";
import { DemoMetricCard } from "@/components/demo/interactive/shared/demo-metric-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ARENA_OPTIONS,
  DEMO_ARTIST,
  DEMO_SHOWS,
  REVENUE_CHART,
  STATES_REACHED,
} from "@/lib/demo/interactive/data";
import type { ScheduleShowForm } from "@/lib/demo/interactive/types";
import { cn } from "@/lib/utils";

type Phase = "dashboard" | "schedule" | "simulation" | "sold_out";

const DEFAULT_FORM: ScheduleShowForm = {
  arena: "theater",
  date: "2026-09-15",
  time: "8:00 PM",
  ticketPrice: 45,
  vipPrice: 125,
  merchEnabled: true,
  expectedAttendance: 7500,
};

export function ArtistDemoExperience() {
  const [phase, setPhase] = useState<Phase>("dashboard");
  const [form, setForm] = useState<ScheduleShowForm>(DEFAULT_FORM);
  const [simSold, setSimSold] = useState(0);
  const [simRevenue, setSimRevenue] = useState(0);

  const arena = ARENA_OPTIONS.find((a) => a.id === form.arena)!;
  const capacity = arena.capacity;

  const runSimulation = useCallback(() => {
    setPhase("simulation");
    setSimSold(0);
    setSimRevenue(0);
    let sold = 0;
    const step = Math.ceil(capacity / 40);
    const interval = setInterval(() => {
      sold = Math.min(sold + step + Math.floor(Math.random() * step), capacity);
      setSimSold(sold);
      setSimRevenue(sold * form.ticketPrice + Math.floor(sold * 0.15) * form.vipPrice);
      if (sold >= capacity) {
        clearInterval(interval);
        setTimeout(() => {
          setPhase("sold_out");
        }, 600);
      }
    }, 120);
  }, [capacity, form.ticketPrice, form.vipPrice]);

  if (phase === "schedule") {
    return (
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Schedule a Show</h1>
          <p className="mt-2 text-muted-foreground">Configure your next digital arena performance.</p>
        </div>
        <div className="glass-panel space-y-6 rounded-2xl p-6">
          <div>
            <Label>Arena tier</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {ARENA_OPTIONS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, arena: a.id, expectedAttendance: a.capacity * 0.85 }))}
                  className={cn(
                    "rounded-xl border p-4 text-left transition",
                    form.arena === a.id ? "border-primary bg-primary/10" : "border-white/10 hover:border-white/20"
                  )}
                >
                  <p className="font-semibold">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.capacity.toLocaleString()} capacity · ${a.fee} booking</p>
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="date">Date</Label><Input id="date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="mt-1" /></div>
            <div><Label htmlFor="time">Time</Label><Input id="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} className="mt-1" /></div>
            <div><Label htmlFor="ticket">Ticket price ($)</Label><Input id="ticket" type="number" value={form.ticketPrice} onChange={(e) => setForm((f) => ({ ...f, ticketPrice: Number(e.target.value) }))} className="mt-1" /></div>
            <div><Label htmlFor="vip">VIP price ($)</Label><Input id="vip" type="number" value={form.vipPrice} onChange={(e) => setForm((f) => ({ ...f, vipPrice: Number(e.target.value) }))} className="mt-1" /></div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.merchEnabled} onChange={(e) => setForm((f) => ({ ...f, merchEnabled: e.target.checked }))} />
            Enable merchandise booth
          </label>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setPhase("dashboard")}>Cancel</Button>
            <Button onClick={runSimulation}>Confirm & Go Live</Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "simulation" || phase === "sold_out") {
    const pct = Math.round((simSold / capacity) * 100);
    return (
      <div className="mx-auto max-w-3xl space-y-8 text-center">
        <AnimatePresence mode="wait">
          {phase === "sold_out" ? (
            <motion.div key="sold" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative space-y-4">
              {Array.from({ length: 30 }).map((_, i) => (
                <motion.span
                  key={i}
                  className="pointer-events-none absolute text-2xl"
                  style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 40}%` }}
                  initial={{ opacity: 1, y: 0, rotate: 0 }}
                  animate={{ opacity: 0, y: 200, rotate: 360 }}
                  transition={{ duration: 2, delay: i * 0.05 }}
                >
                  {["🎉", "✨", "🎊", "⭐", "🔥"][i % 5]}
                </motion.span>
              ))}
              <p className="text-6xl">🎉</p>
              <h1 className="text-gradient text-5xl font-black">SOLD OUT</h1>
              <p className="text-xl text-muted-foreground">{arena.name} · {form.date}</p>
            </motion.div>
          ) : (
            <motion.div key="sim" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="text-2xl font-bold">Ticket sales live...</h1>
              <p className="text-muted-foreground">Fans are entering the arena</p>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="glass-panel rounded-2xl p-8">
          <div className="mb-4 h-4 overflow-hidden rounded-full bg-white/5">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Tickets sold</p>
              <p className="text-3xl font-bold tabular-nums">{simSold.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-3xl font-bold tabular-nums text-emerald-400">${simRevenue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Capacity</p>
              <p className="text-3xl font-bold tabular-nums">{pct}%</p>
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              className="size-2 rounded-full bg-primary/60"
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.1 }}
            />
          ))}
        </div>
        {phase === "sold_out" ? (
          <Button onClick={() => setPhase("dashboard")}>Back to Dashboard</Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-purple-600/30 text-xl font-bold">
            {DEMO_ARTIST.avatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold sm:text-3xl">{DEMO_ARTIST.name}</h1>
              {DEMO_ARTIST.verified ? <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">VERIFIED</span> : null}
            </div>
            <p className="text-muted-foreground">{DEMO_ARTIST.genre}</p>
          </div>
        </div>
        <Button onClick={() => setPhase("schedule")} className="gap-2">
          <Calendar className="size-4" /> Schedule Show
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DemoMetricCard label="Followers" value={DEMO_ARTIST.followers} icon={Users} trend={12.4} resetKey="artist" />
        <DemoMetricCard label="Revenue" value={DEMO_ARTIST.revenue} prefix="$" icon={DollarSign} trend={28.6} resetKey="artist" />
        <DemoMetricCard label="Upcoming Shows" value={DEMO_ARTIST.upcomingShows} icon={Music} format="number" resetKey="artist" />
        <DemoMetricCard label="States Reached" value={DEMO_ARTIST.statesReached} icon={MapPin} format="number" resetKey="artist" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DemoChartPanel title="Revenue" data={REVENUE_CHART} dataKey="revenue" type="area" />
        <DemoChartPanel title="Attendance" data={REVENUE_CHART} dataKey="attendance" type="bar" color="oklch(0.65 0.16 165)" />
      </div>

      <FadeUp>
        <h2 className="mb-4 text-lg font-semibold">Upcoming Shows</h2>
        <div className="space-y-3">
          {DEMO_SHOWS.map((show) => (
            <motion.div key={show.id} whileHover={{ x: 4 }} className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-xl p-4">
              <div>
                <p className="font-semibold">{show.title}</p>
                <p className="text-sm text-muted-foreground">{show.date} · {show.time} · {show.state}</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span>{show.sold.toLocaleString()} / {show.capacity.toLocaleString()} sold</span>
                <span className="font-semibold text-emerald-400">${show.revenue.toLocaleString()}</span>
                {show.status === "sold_out" ? (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-400">SOLD OUT</span>
                ) : null}
              </div>
            </motion.div>
          ))}
        </div>
      </FadeUp>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass-panel rounded-2xl p-5 lg:col-span-2">
          <h3 className="font-semibold">Performance Analytics</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Merch conversion", value: 18.4, suffix: "%" },
              { label: "VIP conversion", value: 12.8, suffix: "%" },
              { label: "Returning fans", value: 42, suffix: "%" },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-white/[0.03] p-4">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="mt-1 text-2xl font-bold">{m.value}{m.suffix}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <h3 className="flex items-center gap-2 font-semibold"><MessageSquare className="size-4" /> Fan Messages</h3>
          <div className="mt-4 space-y-3 text-sm">
            {["Can't wait for Nashville! 🔥", "VIP upgrade worth it", "Best digital tour ever"].map((msg, i) => (
              <div key={i} className="rounded-lg bg-white/[0.03] p-3 text-muted-foreground">{msg}</div>
            ))}
          </div>
        </div>
      </div>

      <FadeUp>
        <h3 className="mb-4 font-semibold">Top States</h3>
        <div className="flex flex-wrap gap-2">
          {STATES_REACHED.map((s) => (
            <span key={s.state} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs">
              {s.state}: <AnimatedCounter value={s.fans} format="compact" resetKey="states" /> fans
            </span>
          ))}
        </div>
      </FadeUp>
    </div>
  );
}
