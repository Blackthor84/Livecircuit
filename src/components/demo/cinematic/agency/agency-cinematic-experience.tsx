"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Calendar,
  FileText,
  Radio,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { DemoEntryScreen } from "@/components/demo/cinematic/engine/intro-sequence";
import { GlassPanel, StatTile } from "@/components/demo/cinematic/engine/cinematic-ui";
import { useArenaEffects } from "@/components/demo/cinematic/engine/use-arena-effects";
import { CinematicShell } from "@/components/demo/cinematic/shared/cinematic-shell";
import { useDemoSound } from "@/components/demo/cinematic/shared/demo-sound-provider";
import { VirtualArena } from "@/components/demo/cinematic/shared/virtual-arena";
import { AGENCY_NOTIFICATIONS, AGENCY_ROSTER, DEMO_META } from "@/lib/demo/cinematic/constants";
import { cn } from "@/lib/utils";

type View = "entry" | "mission" | "arena" | "compare" | "tours";

/** Demo 3 — Agency: manage artists with LiveCircuit */
export function AgencyCinematicExperience() {
  return (
    <CinematicShell>
      <AgencyCinematicExperienceInner />
    </CinematicShell>
  );
}

function AgencyCinematicExperienceInner() {
  const meta = DEMO_META.agency;
  const [view, setView] = useState<View>("entry");
  const [tab, setTab] = useState<"roster" | "analytics" | "notifications">("roster");
  const [selected, setSelected] = useState(AGENCY_ROSTER[0]!);
  const [liveStats, setLiveStats] = useState(selected);
  const [roster, setRoster] = useState(AGENCY_ROSTER);
  const { effects } = useArenaEffects({ curtainsOpen: true, lightsOn: true, fog: true, glowSticks: true, clapping: true, crowdEnergy: 82, lighting: "purple", venueName: "LiveCircuit Arena" });
  const sound = useDemoSound();

  useEffect(() => {
    if (view !== "arena") return;
    const interval = setInterval(() => {
      setLiveStats((s) => ({
        ...s,
        liveAudience: s.liveAudience + Math.floor(Math.random() * 18),
        revenue: s.revenue + Math.floor(Math.random() * 60),
        followers: s.followers + Math.floor(Math.random() * 6),
        merch: s.merch + (Math.random() > 0.7 ? 15 : 0),
      }));
    }, 1800);
    return () => clearInterval(interval);
  }, [view]);

  useEffect(() => {
    if (view !== "mission") return;
    const interval = setInterval(() => {
      setRoster((prev) => prev.map((a) => a.status === "LIVE" ? { ...a, liveAudience: a.liveAudience + Math.floor(Math.random() * 8), revenue: a.revenue + Math.floor(Math.random() * 20) } : a));
    }, 3000);
    return () => clearInterval(interval);
  }, [view]);

  const enterArena = (artist: (typeof AGENCY_ROSTER)[number]) => {
    sound.playClick();
    sound.playCrowd(0.65);
    setSelected(artist);
    setLiveStats(artist);
    setView("arena");
  };

  return (
    <AnimatePresence mode="wait">
        {view === "entry" && (
          <DemoEntryScreen title={meta.title} subtitle={meta.subtitle} cta={meta.entryCta} onEnter={() => { sound.playClick(); setView("mission"); }} />
        )}

        {view === "mission" && (
          <motion.div key="mission" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full flex-col pt-20">
            <div className="border-b border-white/10 bg-black/40 px-4 py-4 backdrop-blur-xl sm:px-8">
              <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Mission Control</p>
                  <h1 className="text-2xl font-bold sm:text-3xl">Digital Wall · {roster.length} Artists</h1>
                </div>
                <div className="flex gap-2">
                  {(["roster", "analytics", "notifications"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setTab(t)} className={cn("rounded-full px-4 py-1.5 text-xs font-medium capitalize transition", tab === t ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:text-foreground")}>{t}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
              <div className="mx-auto max-w-7xl">
                {tab === "roster" && (
                  <>
                    <div className="mb-4 flex flex-wrap gap-2">
                      <ActionChip icon={UserPlus} label="Create Artist" onClick={() => sound.playClick()} />
                      <ActionChip icon={Users} label="Assign Manager" onClick={() => sound.playClick()} />
                      <ActionChip icon={Calendar} label="Schedule Arena" onClick={() => setView("tours")} />
                      <ActionChip icon={BarChart3} label="Compare Performance" onClick={() => setView("compare")} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {roster.map((artist, i) => (
                        <motion.button key={artist.id} type="button" onClick={() => enterArena(artist)} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -4, scale: 1.01 }} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/50 p-5 text-left backdrop-blur-xl">
                          <div className={cn("absolute inset-0 bg-gradient-to-br opacity-10 transition group-hover:opacity-25", artist.color)} />
                          <div className="relative flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className={cn("flex size-11 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-bold", artist.color)}>{artist.avatar}</div>
                              <div>
                                <p className="font-bold">{artist.name}</p>
                                <p className="text-[10px] text-muted-foreground">{artist.show}</p>
                              </div>
                            </div>
                            <StatusBadge status={artist.status} />
                          </div>
                          <div className="relative mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                            <Cell label="Audience" value={artist.liveAudience.toLocaleString()} live={artist.status === "LIVE"} />
                            <Cell label="Revenue" value={`$${artist.revenue.toLocaleString()}`} live={artist.status === "LIVE"} />
                            <Cell label="Followers" value={artist.followers.toLocaleString()} />
                            <Cell label="Merch" value={`$${artist.merch.toLocaleString()}`} />
                            <Cell label="Manager" value={artist.manager} />
                            <Cell label="Growth" value={`+${artist.growth}%`} accent />
                          </div>
                          <p className="relative mt-3 text-xs font-semibold text-primary opacity-0 transition group-hover:opacity-100">Enter Live Arena →</p>
                        </motion.button>
                      ))}
                    </div>
                  </>
                )}

                {tab === "analytics" && (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <GlassPanel className="p-6">
                      <h3 className="font-bold">Agency Revenue</h3>
                      <p className="mt-2 text-4xl font-bold text-emerald-400">$8.4M</p>
                      <p className="text-sm text-muted-foreground">+18% this quarter</p>
                    </GlassPanel>
                    <GlassPanel className="p-6">
                      <h3 className="font-bold">Live Events Now</h3>
                      <p className="mt-2 text-4xl font-bold">{roster.filter((a) => a.status === "LIVE").length}</p>
                    </GlassPanel>
                    <div className="lg:col-span-2 grid gap-3 sm:grid-cols-3">
                      {roster.slice(0, 3).map((a) => (
                        <StatTile key={a.id} label={a.name} value={`$${a.revenue.toLocaleString()}`} delta={`+${a.growth}% growth`} />
                      ))}
                    </div>
                  </div>
                )}

                {tab === "notifications" && (
                  <div className="space-y-3">
                    {AGENCY_NOTIFICATIONS.map((n, i) => (
                      <motion.div key={n.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/50 p-4">
                        <Bell className="mt-0.5 size-4 shrink-0 text-primary" />
                        <div><p className="text-sm">{n.text}</p><p className="text-xs text-muted-foreground">{n.time}</p></div>
                      </motion.div>
                    ))}
                    <GlassPanel className="mt-4 p-4">
                      <p className="flex items-center gap-2 text-sm font-semibold"><FileText className="size-4" /> Contract Reminders</p>
                      <p className="mt-2 text-xs text-muted-foreground">3 contracts renew within 30 days · 2 pending signatures</p>
                    </GlassPanel>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {view === "compare" && (
          <motion.div key="compare" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full overflow-y-auto px-4 pt-20 sm:px-8">
            <button type="button" onClick={() => setView("mission")} className="text-sm text-muted-foreground hover:text-foreground">← Mission Control</button>
            <h2 className="mt-4 text-2xl font-bold">Performance Comparison</h2>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead><tr className="border-b border-white/10 text-xs uppercase tracking-wider text-muted-foreground"><th className="py-3">Artist</th><th className="py-3">Revenue</th><th className="py-3">Audience</th><th className="py-3">Growth</th><th className="py-3">Status</th></tr></thead>
                <tbody>
                  {[...roster].sort((a, b) => b.revenue - a.revenue).map((a) => (
                    <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.03]"><td className="py-3 font-medium">{a.name}</td><td className="py-3">${a.revenue.toLocaleString()}</td><td className="py-3">{a.liveAudience.toLocaleString()}</td><td className="py-3 text-emerald-400">+{a.growth}%</td><td className="py-3"><StatusBadge status={a.status} /></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {view === "tours" && (
          <motion.div key="tours" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full overflow-y-auto px-4 pt-20 sm:px-8">
            <button type="button" onClick={() => setView("mission")} className="text-sm text-muted-foreground hover:text-foreground">← Mission Control</button>
            <h2 className="mt-4 text-2xl font-bold">Tour Management</h2>
            <div className="mt-6 space-y-3">
              {roster.filter((a) => a.status !== "IDLE").map((a) => (
                <GlassPanel key={a.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div><p className="font-bold">{a.name}</p><p className="text-xs text-muted-foreground">{a.show}</p></div>
                  <span className="text-sm">{a.shows} shows scheduled</span>
                  <button type="button" className="rounded-full bg-primary/20 px-4 py-1.5 text-xs font-semibold text-primary">Manage Route</button>
                </GlassPanel>
              ))}
            </div>
          </motion.div>
        )}

        {view === "arena" && (
          <motion.div key="arena" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative h-full pt-16">
            <VirtualArena effects={{ ...effects, venueName: selected.show }} className="absolute inset-0 top-14" />
            <button type="button" onClick={() => { sound.playClick(); setView("mission"); }} className="absolute left-4 top-20 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-4 py-2 text-xs font-medium backdrop-blur-xl">
              <ArrowLeft className="size-3.5" /> Mission Control
            </button>
            <motion.div initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} className="absolute right-4 top-20 z-20 w-48 space-y-2 sm:w-52">
              <GlassPanel className="p-4"><p className="text-lg font-bold">{selected.name}</p><p className="text-xs text-muted-foreground">{selected.show}</p></GlassPanel>
              <LiveStat icon={Users} label="Audience" value={liveStats.liveAudience.toLocaleString()} />
              <LiveStat icon={TrendingUp} label="Revenue" value={`$${liveStats.revenue.toLocaleString()}`} />
              <LiveStat icon={Radio} label="Followers" value={liveStats.followers.toLocaleString()} />
              <LiveStat icon={TrendingUp} label="Merch" value={`$${liveStats.merch.toLocaleString()}`} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
  );
}

function ActionChip({ icon: Icon, label, onClick }: { icon: typeof Users; label: string; onClick: () => void }) {
  return (
    <motion.button type="button" onClick={onClick} whileHover={{ scale: 1.04 }} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium">
      <Icon className="size-3.5" /> {label}
    </motion.button>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", status === "LIVE" ? "bg-red-500/20 text-red-400" : status === "ON TOUR" ? "bg-primary/20 text-primary" : "bg-white/10 text-muted-foreground")}>{status}</span>
  );
}

function Cell({ label, value, live, accent }: { label: string; value: string; live?: boolean; accent?: boolean }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <motion.p key={value} animate={live ? { color: ["#fff", "#a855f7", "#fff"] } : {}} transition={{ duration: 2, repeat: live ? Infinity : 0 }} className={cn("font-bold tabular-nums", accent && "text-emerald-400")}>{value}</motion.p>
    </div>
  );
}

function LiveStat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <GlassPanel className="p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground"><Icon className="size-3" /> {label}</div>
      <motion.p key={value} initial={{ scale: 1.06 }} animate={{ scale: 1 }} className="text-xl font-bold tabular-nums">{value}</motion.p>
    </GlassPanel>
  );
}
