"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Check,
  DollarSign,
  Loader2,
  MessageSquare,
  Music,
  Package,
  Plus,
  ShoppingBag,
  TrendingUp,
  Users,
  BarChart3,
  Bell,
} from "lucide-react";
import { DemoChartPanel } from "@/components/demo/interactive/shared/demo-chart-panel";
import { DemoConfetti } from "@/components/demo/interactive/shared/demo-confetti";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ARENA_OPTIONS,
  DEMO_ARTIST,
  DEMO_ARTIST_DASHBOARD,
  DEMO_CITIES,
  DEMO_SHOWS,
  MERCH_OPTIONS,
  REVENUE_CHART,
  TOUR_PUBLISH_CITIES,
  TOUR_SALE_SEQUENCE,
} from "@/lib/demo/interactive/data";
import type { ScheduleShowForm } from "@/lib/demo/interactive/types";
import { cn } from "@/lib/utils";

type PublishPhase = "idle" | "publishing" | "success" | "selling";
type NavTab = "dashboard" | "shows" | "analytics" | "messages" | "merch";

const DEFAULT_FORM: ScheduleShowForm = {
  arena: "arena",
  city: "Seattle",
  date: "2026-10-03",
  time: "8:00 PM",
  ticketPrice: 55,
  vipPrice: 149,
  merchOptions: ["Tour T-Shirt ($35)", "Signed Poster ($25)"],
  expectedAttendance: 10000,
};

function formatMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function ArtistDemoExperience() {
  const [nav, setNav] = useState<NavTab>("dashboard");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [form, setForm] = useState<ScheduleShowForm>(DEFAULT_FORM);
  const [publishPhase, setPublishPhase] = useState<PublishPhase>("idle");
  const [shows, setShows] = useState(DEMO_SHOWS);
  const [revenue, setRevenue] = useState(DEMO_ARTIST.revenue);
  const [liveSold, setLiveSold] = useState(0);
  const [liveRevenue, setLiveRevenue] = useState(0);
  const [saleStep, setSaleStep] = useState(0);
  const [fanBurst, setFanBurst] = useState<number | null>(null);
  const [occupiedSeats, setOccupiedSeats] = useState(0);

  const navItems: { id: NavTab; label: string; icon: typeof BarChart3 }[] = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "shows", label: "Shows", icon: Calendar },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "merch", label: "Merch", icon: Package },
  ];

  const runPublish = useCallback(() => {
    setScheduleOpen(false);
    setPublishPhase("publishing");
    setTimeout(() => setPublishPhase("success"), 2200);
  }, []);

  useEffect(() => {
    if (publishPhase !== "success") return;
    const t = setTimeout(() => {
      setPublishPhase("selling");
      setShows((prev) => [
        ...prev,
        {
          id: "s-new",
          title: `Neon Dreams — ${form.city}`,
          arena: ARENA_OPTIONS.find((a) => a.id === form.arena)?.name ?? "Arena",
          tier: form.arena,
          state: form.city.slice(0, 2).toUpperCase(),
          city: form.city,
          date: form.date,
          time: form.time,
          ticketPrice: form.ticketPrice,
          vipPrice: form.vipPrice,
          capacity: ARENA_OPTIONS.find((a) => a.id === form.arena)?.capacity ?? 10000,
          sold: 0,
          revenue: 0,
          status: "upcoming" as const,
        },
      ]);
    }, 2500);
    return () => clearTimeout(t);
  }, [publishPhase, form]);

  useEffect(() => {
    if (publishPhase !== "selling") return;
    const { fanIncrements, revenueSteps } = TOUR_SALE_SEQUENCE;
    let step = 0;
    let cumulativeFans = 0;

    const interval = setInterval(() => {
      if (step >= fanIncrements.length) {
        clearInterval(interval);
        setRevenue(revenueSteps[revenueSteps.length - 1]!);
        return;
      }
      cumulativeFans += fanIncrements[step]!;
      setLiveSold(cumulativeFans);
      setLiveRevenue(revenueSteps[step] ?? revenueSteps[revenueSteps.length - 1]!);
      setRevenue(revenueSteps[step] ?? revenueSteps[revenueSteps.length - 1]!);
      setFanBurst(fanIncrements[step]!);
      setOccupiedSeats(Math.min(100, Math.round((cumulativeFans / 140) * 100)));
      setSaleStep(step);
      setShows((prev) =>
        prev.map((s) =>
          s.id === "s-new"
            ? { ...s, sold: cumulativeFans, revenue: revenueSteps[step] ?? s.revenue }
            : s
        )
      );
      step++;
      setTimeout(() => setFanBurst(null), 800);
    }, 900);

    return () => clearInterval(interval);
  }, [publishPhase]);

  const resetDemo = () => {
    setPublishPhase("idle");
    setShows(DEMO_SHOWS);
    setRevenue(DEMO_ARTIST.revenue);
    setLiveSold(0);
    setLiveRevenue(0);
    setSaleStep(0);
    setOccupiedSeats(0);
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] gap-0 overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl lg:gap-0">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-white/10 bg-black/30 p-4 lg:flex">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/40 to-purple-600/30 text-sm font-bold">
            {DEMO_ARTIST.avatar}
          </div>
          <div>
            <p className="text-sm font-bold">{DEMO_ARTIST.name}</p>
            <p className="text-[10px] text-muted-foreground">Artist Dashboard</p>
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setNav(item.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition",
                nav === item.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
              {item.id === "messages" && (
                <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">2</span>
              )}
            </button>
          ))}
        </nav>
        <Button className="mt-auto gap-2" onClick={() => setScheduleOpen(true)}>
          <Plus className="size-4" /> Schedule New Show
        </Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/20 text-xs font-bold">{DEMO_ARTIST.avatar}</div>
            <p className="font-bold">{DEMO_ARTIST.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="relative rounded-lg p-2 hover:bg-white/5">
              <Bell className="size-5 text-muted-foreground" />
              <span className="absolute right-1 top-1 size-2 rounded-full bg-primary" />
            </button>
            <Button size="sm" className="gap-1.5 lg:hidden" onClick={() => setScheduleOpen(true)}>
              <Calendar className="size-4" /> Schedule Show
            </Button>
          </div>
        </header>

        <main className="relative flex-1 overflow-y-auto p-4 sm:p-6">
          {(nav === "dashboard" || nav === "shows") && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricTile label="Revenue" value={formatMoney(revenue)} icon={DollarSign} pulse={publishPhase === "selling"} />
                <MetricTile label="Followers" value={DEMO_ARTIST.followers.toLocaleString()} icon={Users} />
                <MetricTile label="Monthly Listeners" value={`${(DEMO_ARTIST_DASHBOARD.monthlyListeners / 1_000_000).toFixed(2)}M`} icon={Music} />
                <MetricTile label="Merch Sales" value={formatMoney(DEMO_ARTIST_DASHBOARD.merchSales)} icon={ShoppingBag} />
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Upcoming Shows</h2>
                  {shows.map((show) => {
                    const pct = Math.round((show.sold / show.capacity) * 100);
                    return (
                      <motion.div
                        key={show.id}
                        layout
                        className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold">{show.city ?? show.title}</p>
                            <p className="text-xs text-muted-foreground">{show.date} · {show.time} · {show.arena}</p>
                          </div>
                          <span className="text-sm font-bold text-emerald-400">{formatMoney(show.revenue || show.sold * show.ticketPrice)}</span>
                        </div>
                        <div className="mt-3">
                          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                            <span>{show.sold.toLocaleString()} sold</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/5">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        </div>
                        {show.id === "s-new" && publishPhase === "selling" && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {Array.from({ length: 20 }).map((_, i) => (
                              <motion.div
                                key={i}
                                className="size-2 rounded-sm bg-primary/60"
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: i < occupiedSeats / 5 ? 1 : 0.2, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                              />
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                <div className="space-y-4">
                  <Panel title="Notifications" icon={Bell}>
                    {DEMO_ARTIST_DASHBOARD.notifications.map((n) => (
                      <div key={n.id} className="border-b border-white/5 py-2 last:border-0">
                        <p className="text-sm">{n.title}</p>
                        <p className="text-xs text-muted-foreground">{n.time}</p>
                      </div>
                    ))}
                  </Panel>
                  <Panel title="Messages" icon={MessageSquare}>
                    {DEMO_ARTIST_DASHBOARD.messages.slice(0, 2).map((m) => (
                      <div key={m.id} className={cn("rounded-lg p-2 text-sm", m.unread && "bg-primary/10")}>
                        <p className="font-medium">{m.from}</p>
                        <p className="truncate text-xs text-muted-foreground">{m.preview}</p>
                      </div>
                    ))}
                  </Panel>
                </div>
              </div>
            </div>
          )}

          {nav === "analytics" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <DemoChartPanel title="Revenue" data={REVENUE_CHART} dataKey="revenue" type="area" />
              <DemoChartPanel title="Attendance" data={REVENUE_CHART} dataKey="attendance" type="bar" color="oklch(0.65 0.16 165)" />
              <div className="glass-panel rounded-2xl p-5 lg:col-span-2">
                <h3 className="font-semibold">Performance Breakdown</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-4">
                  {[
                    { label: "Ticket conversion", value: "24.8%" },
                    { label: "VIP upsell", value: "14.2%" },
                    { label: "Merch attach", value: "18.4%" },
                    { label: "Returning fans", value: "42%" },
                  ].map((m) => (
                    <div key={m.label} className="rounded-xl bg-white/[0.03] p-4">
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <p className="mt-1 text-xl font-bold">{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {nav === "messages" && (
            <div className="mx-auto max-w-2xl space-y-3">
              {DEMO_ARTIST_DASHBOARD.messages.map((m) => (
                <motion.button
                  key={m.id}
                  type="button"
                  whileHover={{ x: 4 }}
                  className={cn("flex w-full items-start gap-3 rounded-xl border border-white/10 p-4 text-left", m.unread && "border-primary/30 bg-primary/5")}
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold">
                    {m.from.slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold">{m.from}</p>
                    <p className="text-sm text-muted-foreground">{m.preview}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{m.time}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          {nav === "merch" && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {MERCH_OPTIONS.map((item) => (
                <motion.div key={item} whileHover={{ y: -4 }} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                  <Package className="size-5 text-primary" />
                  <p className="mt-3 font-semibold">{item.split(" (")[0]}</p>
                  <p className="text-sm text-muted-foreground">{item.match(/\(([^)]+)\)/)?.[1]}</p>
                  <p className="mt-2 text-xs text-emerald-400">847 sold this tour</p>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-background/95 sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Schedule New Show</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <Label>Arena</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {ARENA_OPTIONS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, arena: a.id }))}
                    className={cn(
                      "rounded-xl border p-3 text-left text-sm transition",
                      form.arena === a.id ? "border-primary bg-primary/10" : "border-white/10 hover:border-white/20"
                    )}
                  >
                    <p className="font-semibold">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.capacity.toLocaleString()} cap · ${a.fee}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>City</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {DEMO_CITIES.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, city }))}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition",
                      form.city === city ? "border-primary bg-primary/15 text-primary" : "border-white/10 hover:border-white/20"
                    )}
                  >
                    {city}
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
            <div>
              <Label>Merchandise options</Label>
              <div className="mt-2 space-y-2">
                {MERCH_OPTIONS.map((opt) => (
                  <label key={opt} className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 p-2 text-sm hover:bg-white/[0.03]">
                    <input
                      type="checkbox"
                      checked={form.merchOptions.includes(opt)}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          merchOptions: e.target.checked ? [...f.merchOptions, opt] : f.merchOptions.filter((o) => o !== opt),
                        }))
                      }
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button onClick={runPublish}>Publish Tour</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {publishPhase !== "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
          >
            <motion.div
              layout
              className="w-full max-w-md rounded-2xl border border-white/10 bg-background p-8 text-center shadow-2xl"
            >
              {publishPhase === "publishing" && (
                <>
                  <Loader2 className="mx-auto size-12 animate-spin text-primary" />
                  <p className="mt-4 text-xl font-bold">Publishing Tour...</p>
                </>
              )}
              {publishPhase === "success" && (
                <>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/20">
                    <Check className="size-8 text-emerald-400" />
                  </motion.div>
                  <p className="mt-4 text-xl font-bold text-emerald-400">✓ Tour Published Successfully</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {TOUR_PUBLISH_CITIES.map((city, i) => (
                      <motion.span
                        key={city}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.15 }}
                        className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium"
                      >
                        {city}
                      </motion.span>
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">Tickets are now on sale.</p>
                </>
              )}
              {publishPhase === "selling" && (
                <>
                  <p className="text-lg font-bold">Fans purchasing tickets</p>
                  <AnimatePresence mode="wait">
                    {fanBurst != null && (
                      <motion.p
                        key={fanBurst}
                        initial={{ opacity: 0, y: 20, scale: 0.5 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -30 }}
                        className="mt-4 text-5xl font-black text-primary"
                      >
                        +{fanBurst}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <p className="mt-6 text-sm text-muted-foreground">Total sold: {liveSold}</p>
                  <motion.p
                    key={liveRevenue}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className="mt-2 text-3xl font-bold text-emerald-400"
                  >
                    {formatMoney(liveRevenue)}
                  </motion.p>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400"
                      animate={{ width: `${((saleStep + 1) / TOUR_SALE_SEQUENCE.revenueSteps.length) * 100}%` }}
                    />
                  </div>
                  {saleStep >= TOUR_SALE_SEQUENCE.revenueSteps.length - 1 && (
                    <Button className="mt-6" onClick={resetDemo}>Back to Dashboard</Button>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DemoConfetti active={publishPhase === "selling" && saleStep >= TOUR_SALE_SEQUENCE.revenueSteps.length - 1} />
    </div>
  );
}

function MetricTile({ label, value, icon: Icon, pulse }: { label: string; value: string; icon: typeof DollarSign; pulse?: boolean }) {
  return (
    <motion.div
      animate={pulse ? { boxShadow: ["0 0 0 0 rgba(168,85,247,0)", "0 0 0 8px rgba(168,85,247,0.2)", "0 0 0 0 rgba(168,85,247,0)"] } : {}}
      transition={{ duration: 1, repeat: pulse ? Infinity : 0 }}
      className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="size-4 text-primary/60" />
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    </motion.div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Bell; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-primary" /> {title}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}
