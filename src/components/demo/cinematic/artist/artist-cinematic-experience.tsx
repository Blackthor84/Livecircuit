"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Calendar,
  Cloud,
  Gift,
  Map,
  MessageCircle,
  Music,
  PartyPopper,
  Sparkles,
  Square,
  Sun,
  Users,
  Vote,
  Zap,
} from "lucide-react";
import { ActionButton, GlassPanel, StatTile } from "@/components/demo/cinematic/engine/cinematic-ui";
import { DemoEntryScreen } from "@/components/demo/cinematic/engine/intro-sequence";
import { LiveNotificationStack } from "@/components/demo/cinematic/engine/notification-system";
import { useArenaEffects } from "@/components/demo/cinematic/engine/use-arena-effects";
import { TourBuilderMap } from "@/components/demo/cinematic/artist/tour-builder-map";
import { CinematicShell } from "@/components/demo/cinematic/shared/cinematic-shell";
import { useDemoSound } from "@/components/demo/cinematic/shared/demo-sound-provider";
import { VirtualArena } from "@/components/demo/cinematic/shared/virtual-arena";
import { ARTIST_CHAT, ARTIST_LIVE_STATS, DEMO_META } from "@/lib/demo/cinematic/constants";

type Phase = "entry" | "pre-show" | "countdown" | "live" | "ended" | "tour" | "analytics";

const LIVE_NOTIFS = [
  { type: "tip", text: "+ New Tip · $20", icon: Sparkles },
  { type: "vip", text: "+ VIP Joined", icon: Users },
  { type: "follow", text: "+ 47 New Followers", icon: Users },
  { type: "merch", text: "+ Merch Sold", icon: Gift },
  { type: "encore", text: "+ Encore Requested", icon: Zap },
  { type: "request", text: "+ Song Request Accepted", icon: Music },
];

/** Demo 2 — Artist: perform on LiveCircuit */
export function ArtistCinematicExperience() {
  const meta = DEMO_META.artist;
  const [phase, setPhase] = useState<Phase>("entry");
  const [countdown, setCountdown] = useState(3);
  const { effects, patch } = useArenaEffects({
    curtainsOpen: true,
    lightsOn: false,
    crowdEnergy: 55,
    lighting: "purple",
    venueName: "Boston Harbor Arena",
  });
  const [stats, setStats] = useState(ARTIST_LIVE_STATS);
  const [notifications, setNotifications] = useState<{ id: number; text: string; icon: typeof Sparkles }[]>([]);
  const [chat, setChat] = useState<typeof ARTIST_CHAT>([]);
  const sound = useDemoSound();

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("live");
      patch({ lightsOn: true, pyro: true, confetti: true, fog: true, crowdEnergy: 98, lighting: "strobe", clapping: true });
      sound.playCrowd(1);
      sound.playBass();
      setTimeout(() => patch({ pyro: false, confetti: false, lighting: "purple", clapping: false }), 2200);
      return;
    }
    sound.playBass();
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown, patch, sound]);

  useEffect(() => {
    if (phase !== "live") return;
    let i = 0;
    const chatInterval = setInterval(() => setChat((prev) => [...prev.slice(-4), ARTIST_CHAT[i % ARTIST_CHAT.length]!]), 3000);
    const notifInterval = setInterval(() => {
      const n = LIVE_NOTIFS[i % LIVE_NOTIFS.length]!;
      setNotifications((prev) => [...prev.slice(-5), { id: Date.now(), text: n.text, icon: n.icon }]);
      setStats((s) => ({
        ...s,
        tips: s.tips + (n.type === "tip" ? 20 : 0),
        followersGained: s.followersGained + (n.type === "follow" ? 47 : 0),
        merchSales: s.merchSales + (n.type === "merch" ? 35 : 0),
        vipMembers: s.vipMembers + (n.type === "vip" ? 3 : 0),
        encoreRequests: s.encoreRequests + (n.type === "encore" ? 120 : 0),
        audience: s.audience + Math.floor(Math.random() * 35),
        revenueTonight: s.revenueTonight + (n.type === "tip" ? 20 : n.type === "merch" ? 35 : 0),
      }));
      i++;
    }, 2600);
    return () => { clearInterval(chatInterval); clearInterval(notifInterval); };
  }, [phase]);

  const startShow = () => { sound.playClick(); setPhase("countdown"); setCountdown(3); };
  const endShow = () => { sound.playApplause(); patch({ confetti: true, crowdEnergy: 100 }); setPhase("ended"); };

  const control = (action: string) => {
    sound.playClick();
    switch (action) {
      case "lighting": patch({ lighting: effects.lighting === "purple" ? "cyan" : effects.lighting === "cyan" ? "gold" : "purple" }); break;
      case "confetti": patch({ confetti: true }); setTimeout(() => patch({ confetti: false }), 2500); break;
      case "fog": patch({ fog: !effects.fog }); break;
      case "meet": sound.playApplause(); break;
      case "merch": setStats((s) => ({ ...s, merchSales: s.merchSales + 35 })); patch({ confetti: true }); setTimeout(() => patch({ confetti: false }), 1500); break;
      case "poll": break;
      case "vip": patch({ glowSticks: true, crowdEnergy: Math.min(100, effects.crowdEnergy + 12) }); setStats((s) => ({ ...s, vipMembers: s.vipMembers + 5 })); break;
      case "requests": setNotifications((p) => [...p.slice(-4), { id: Date.now(), text: "+ Song Request Accepted", icon: Music }]); break;
    }
  };

  if (phase === "tour") return <CinematicShell><div className="flex h-full flex-col pt-20"><TourBuilderMap onBack={() => setPhase("pre-show")} /></div></CinematicShell>;
  if (phase === "analytics") return (
    <CinematicShell>
      <div className="h-full overflow-y-auto px-4 pb-8 pt-20 sm:px-8">
        <button type="button" onClick={() => setPhase("live")} className="text-sm text-muted-foreground hover:text-foreground">← Back to Show</button>
        <h2 className="mt-4 text-2xl font-bold">Fan Analytics</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[{ l: "Peak Audience", v: "14,200" }, { l: "Avg Watch Time", v: "47 min" }, { l: "Tip Conversion", v: "8.4%" }, { l: "Merch Attach", v: "18.2%" }, { l: "VIP Upsell", v: "12.1%" }, { l: "Encore Rate", v: "94%" }].map((x) => (
            <StatTile key={x.l} label={x.l} value={x.v} />
          ))}
        </div>
      </div>
    </CinematicShell>
  );

  return (
    <CinematicShell>
      <AnimatePresence mode="wait">
        {phase === "entry" && <DemoEntryScreen title={meta.title} subtitle={meta.subtitle} cta={meta.entryCta} onEnter={() => { sound.playClick(); setPhase("pre-show"); sound.playCrowd(0.35); }} />}
      </AnimatePresence>

      {phase !== "entry" && (
        <div className="relative h-full pt-16">
          <VirtualArena effects={effects} className="absolute inset-0 top-14" />

          {phase === "pre-show" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 top-14 z-10 flex flex-col bg-gradient-to-b from-black/80 via-black/40 to-black/90">
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <p className="text-xs uppercase tracking-[0.35em] text-primary">Backstage</p>
                <p className="mt-3 max-w-md text-2xl font-bold">Thousands of lights stretch into the distance</p>
                <p className="mt-2 text-muted-foreground">The crowd is waiting. Stage lights are off.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 px-4 pb-10">
                <motion.button type="button" onClick={startShow} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="rounded-full bg-gradient-to-r from-primary to-accent px-12 py-4 text-lg font-bold shadow-2xl shadow-primary/40">START SHOW</motion.button>
                <ActionButton icon={Map} label="Build Tour" onClick={() => { sound.playClick(); setPhase("tour"); }} />
                <ActionButton icon={Calendar} label="Schedule Show" onClick={() => { sound.playClick(); setPhase("tour"); }} />
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {phase === "countdown" && countdown > 0 && (
              <motion.div key={countdown} initial={{ scale: 2.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <span className="text-gradient text-[120px] font-black tabular-nums sm:text-[160px]">{countdown}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {(phase === "live" || phase === "ended") && (
            <>
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="absolute inset-x-3 top-20 z-20 grid grid-cols-2 gap-2 sm:inset-x-6 sm:grid-cols-4 lg:grid-cols-8">
                <StatTile label="Audience" value={stats.audience.toLocaleString()} />
                <StatTile label="Tips" value={`$${stats.tips.toLocaleString()}`} />
                <StatTile label="Followers +" value={stats.followersGained.toLocaleString()} />
                <StatTile label="Merch" value={`$${stats.merchSales.toLocaleString()}`} />
                <StatTile label="VIP" value={stats.vipMembers.toLocaleString()} />
                <StatTile label="Revenue" value={`$${stats.revenueTonight.toLocaleString()}`} />
                <StatTile label="Encore" value={stats.encoreRequests.toLocaleString()} />
                <StatTile label="Capacity" value={`${Math.round((stats.audience / stats.capacity) * 100)}%`} />
              </motion.div>

              <div className="absolute left-3 top-[42%] z-20 w-44 sm:left-5 sm:w-52">
                <LiveNotificationStack items={notifications} />
              </div>

              <GlassPanel className="absolute right-3 top-[42%] hidden w-44 p-3 sm:block sm:w-48">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-primary">Live Chat</p>
                {chat.map((c, i) => <p key={i} className="text-[10px] text-muted-foreground"><span className="text-primary">{c.user}</span> {c.message}</p>)}
              </GlassPanel>

              {phase === "live" && (
                <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute inset-x-3 bottom-4 z-20 rounded-2xl border border-white/10 bg-black/75 p-3 backdrop-blur-2xl sm:inset-x-6 sm:p-4">
                  <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Performance Controls</p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    <ActionButton icon={Square} label="End Show" onClick={endShow} />
                    <ActionButton icon={Gift} label="Merch Drop" onClick={() => control("merch")} />
                    <ActionButton icon={Sun} label="Lighting" onClick={() => control("lighting")} />
                    <ActionButton icon={Cloud} label="Fog" onClick={() => control("fog")} />
                    <ActionButton icon={PartyPopper} label="Confetti" onClick={() => control("confetti")} />
                    <ActionButton icon={MessageCircle} label="Meet & Greet" onClick={() => control("meet")} />
                    <ActionButton icon={Vote} label="Poll" onClick={() => control("poll")} />
                    <ActionButton icon={Music} label="Requests" onClick={() => control("requests")} />
                    <ActionButton icon={Sparkles} label="VIP Room" onClick={() => control("vip")} />
                    <ActionButton icon={BarChart3} label="Analytics" onClick={() => setPhase("analytics")} />
                    <ActionButton icon={Map} label="Tour Builder" onClick={() => setPhase("tour")} />
                  </div>
                </motion.div>
              )}

              {phase === "ended" && (
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                  <p className="text-4xl font-bold">Show Complete</p>
                  <p className="mt-2 text-muted-foreground">${stats.revenueTonight.toLocaleString()} earned tonight</p>
                  <button type="button" onClick={() => setPhase("pre-show")} className="mt-8 rounded-full bg-primary px-8 py-3 font-semibold">Go Again</button>
                </motion.div>
              )}
            </>
          )}
        </div>
      )}
    </CinematicShell>
  );
}
