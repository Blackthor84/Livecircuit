"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Crown,
  HandMetal,
  Heart,
  MapPin,
  MessageCircle,
  Mic2,
  ShoppingBag,
  Sparkles,
  Star,
  Volume2,
  Zap,
} from "lucide-react";
import { ActionButton, EnergyMeter, GlassPanel } from "@/components/demo/cinematic/engine/cinematic-ui";
import { CinematicIntro, DemoEntryScreen } from "@/components/demo/cinematic/engine/intro-sequence";
import { ToastNotification } from "@/components/demo/cinematic/engine/notification-system";
import { useArenaEffects } from "@/components/demo/cinematic/engine/use-arena-effects";
import { CinematicShell } from "@/components/demo/cinematic/shared/cinematic-shell";
import { useDemoSound } from "@/components/demo/cinematic/shared/demo-sound-provider";
import { VirtualArena } from "@/components/demo/cinematic/shared/virtual-arena";
import {
  ARENA_VENUES,
  DEMO_META,
  FAN_CHAT_MESSAGES,
  FAN_MERCH,
  REACTION_EMOJIS,
} from "@/lib/demo/cinematic/constants";
import type { CameraAngle } from "@/lib/demo/cinematic/constants";
import { cn } from "@/lib/utils";

type Scene = "entry" | "intro" | "tunnel" | "curtains" | "live";

/** Demo 1 — Fan: attend the future of live entertainment */
export function FanCinematicExperience() {
  const meta = DEMO_META.fan;
  const [scene, setScene] = useState<Scene>("entry");
  const [tunnelProgress, setTunnelProgress] = useState(0);
  const [venueIndex, setVenueIndex] = useState(0);
  const venue = ARENA_VENUES[venueIndex]!;
  const { effects, patch, addHeart, addEmoji } = useArenaEffects({
    fog: true,
    curtainsOpen: false,
    crowdEnergy: 45,
    venueName: venue.name,
    lighting: venue.lighting,
  });
  const [viewers, setViewers] = useState(11847);
  const [encore, setEncore] = useState(18);
  const [chat, setChat] = useState<typeof FAN_CHAT_MESSAGES>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [vipActive, setVipActive] = useState(false);
  const [merchOpen, setMerchOpen] = useState(false);
  const [showVenues, setShowVenues] = useState(false);
  const sound = useDemoSound();

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  useEffect(() => { if (scene === "intro") { const t = setTimeout(() => setScene("tunnel"), 3200); return () => clearTimeout(t); } }, [scene]);

  useEffect(() => {
    if (scene !== "tunnel") return;
    let p = 0;
    const interval = setInterval(() => {
      p += 0.035;
      setTunnelProgress(Math.min(p, 1));
      sound.playCrowd(p * 0.55);
      if (p > 0.25) sound.playBass();
      if (p >= 1) { clearInterval(interval); setTimeout(() => setScene("curtains"), 500); }
    }, 70);
    return () => clearInterval(interval);
  }, [scene, sound]);

  useEffect(() => {
    if (scene !== "curtains") return;
    const t = setTimeout(() => {
      patch({ curtainsOpen: true, lightsOn: true, crowdEnergy: 72, clapping: true });
      sound.playCrowd(0.85);
      sound.playApplause();
      setTimeout(() => setScene("live"), 2600);
    }, 500);
    return () => clearTimeout(t);
  }, [scene, patch, sound]);

  useEffect(() => {
    if (scene !== "live") return;
    let i = 0;
    const interval = setInterval(() => {
      setChat((prev) => [...prev.slice(-6), FAN_CHAT_MESSAGES[i % FAN_CHAT_MESSAGES.length]!]);
      setViewers((v) => v + Math.floor(Math.random() * 12));
      i++;
    }, 2000);
    return () => clearInterval(interval);
  }, [scene]);

  const setCamera = (camera: CameraAngle) => { sound.playClick(); patch({ camera }); };

  const switchVenue = (idx: number) => {
    sound.playClick();
    setVenueIndex(idx);
    const v = ARENA_VENUES[idx]!;
    patch({ venueName: v.name, lighting: v.lighting, pyro: true });
    notify(`Switched to ${v.city}`);
    setShowVenues(false);
    setTimeout(() => patch({ pyro: false }), 1200);
  };

  return (
    <CinematicShell>
      <ToastNotification message={toast} />
      <AnimatePresence mode="wait">
        {scene === "entry" && (
          <DemoEntryScreen title={meta.title} subtitle={meta.subtitle} cta={meta.entryCta} onEnter={() => { sound.playClick(); setScene("intro"); }} />
        )}
        {(scene === "intro" || scene === "tunnel") && (
          <CinematicIntro connectMessage={meta.connectMessage} tunnelProgress={tunnelProgress} phase={scene === "intro" ? "logo" : "tunnel"} />
        )}
        {(scene === "curtains" || scene === "live") && (
          <motion.div key="arena" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative h-full pt-16">
            <VirtualArena effects={effects} className="absolute inset-0 top-14" />

            {scene === "live" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 1 }} className="pointer-events-none absolute inset-0 top-14 z-10 p-3 sm:p-5">
                <GlassPanel className="pointer-events-auto absolute bottom-28 left-3 w-44 p-3 sm:bottom-auto sm:left-5 sm:top-20 sm:w-52">
                  <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary"><MessageCircle className="size-3" /> Live Chat</p>
                  <div className="max-h-36 space-y-1 overflow-hidden sm:max-h-44">
                    <AnimatePresence mode="popLayout">
                      {chat.map((c, i) => (
                        <motion.p key={`${c.user}-${i}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="text-[10px] sm:text-xs">
                          <span className="font-semibold text-primary">{c.user}</span> {c.message} {c.emoji}
                        </motion.p>
                      ))}
                    </AnimatePresence>
                  </div>
                </GlassPanel>

                <div className="pointer-events-auto absolute right-3 top-20 w-40 space-y-2 sm:right-5 sm:w-44">
                  <StatMini label="Viewers" value={viewers.toLocaleString()} />
                  <EnergyMeter label="Crowd Energy" value={effects.crowdEnergy} />
                  <EnergyMeter label="Encore" value={encore} color="amber" />
                  {vipActive && <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-center text-[10px] font-bold text-amber-300">VIP LOUNGE ACTIVE</p>}
                </div>

                <AnimatePresence>
                  {merchOpen && (
                    <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="pointer-events-auto absolute right-0 top-32 w-48 border-l border-white/10 bg-black/85 p-4 backdrop-blur-2xl sm:w-56">
                      <p className="flex items-center gap-2 text-sm font-bold"><ShoppingBag className="size-4 text-primary" /> Merch Booth</p>
                      {FAN_MERCH.map((item) => (
                        <button key={item.id} type="button" onClick={() => { sound.playTip(); notify(`Purchased ${item.name}`); patch({ confetti: true }); setTimeout(() => patch({ confetti: false }), 2000); }} className="mt-3 flex w-full items-center justify-between rounded-lg border border-white/10 p-2 text-xs hover:border-primary/30">
                          <span>{item.name}</span><span className="font-bold">${item.price}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {showVenues && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pointer-events-auto absolute inset-x-4 bottom-36 rounded-2xl border border-white/10 bg-black/80 p-4 backdrop-blur-2xl sm:inset-x-auto sm:left-1/2 sm:w-96 sm:-translate-x-1/2">
                      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Switch Arena</p>
                      <div className="grid grid-cols-2 gap-2">
                        {ARENA_VENUES.map((v, i) => (
                          <button key={v.id} type="button" onClick={() => switchVenue(i)} className={cn("rounded-xl border p-3 text-left text-xs transition", venueIndex === i ? "border-primary bg-primary/15" : "border-white/10 hover:border-white/20")}>
                            <p className="font-bold">{v.city}</p><p className="text-muted-foreground">{v.name}</p>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="pointer-events-auto absolute inset-x-2 bottom-3 sm:inset-x-4">
                  <div className="flex flex-wrap justify-center gap-1.5">
                    <ActionButton icon={HandMetal} label="Clap" onClick={() => { sound.playApplause(); patch({ clapping: true, crowdEnergy: Math.min(100, effects.crowdEnergy + 10) }); setTimeout(() => patch({ clapping: false }), 1200); }} />
                    <ActionButton icon={Volume2} label="Cheer" onClick={() => { sound.playCrowd(1); patch({ cheering: true, crowdEnergy: Math.min(100, effects.crowdEnergy + 8) }); setTimeout(() => patch({ cheering: false }), 1500); }} />
                    <ActionButton icon={Sparkles} label="Glow Sticks" onClick={() => { sound.playClick(); patch({ glowSticks: true, crowdEnergy: Math.min(100, effects.crowdEnergy + 6) }); }} />
                    <ActionButton icon={Mic2} label="Encore" onClick={() => { sound.playApplause(); setEncore((e) => Math.min(100, e + 12)); patch({ crowdEnergy: Math.min(100, effects.crowdEnergy + 10) }); }} />
                    <ActionButton icon={Heart} label="Heart" onClick={() => { addHeart(); patch({ crowdEnergy: Math.min(100, effects.crowdEnergy + 3) }); }} />
                    <ActionButton icon={Star} label="Tip $20" onClick={() => { sound.playTip(); notify("$20 Tip Received"); patch({ pyro: true }); setTimeout(() => patch({ pyro: false }), 1000); }} variant="accent" />
                    <ActionButton icon={ShoppingBag} label="Merch" onClick={() => { sound.playClick(); setMerchOpen((o) => !o); }} />
                    <ActionButton icon={Crown} label={vipActive ? "VIP ✓" : "Join VIP"} onClick={() => { sound.playClick(); setVipActive(true); setCamera("vip"); notify("Welcome to VIP"); }} variant="primary" />
                  </div>
                  <div className="mt-2 flex flex-wrap justify-center gap-1">
                    {REACTION_EMOJIS.map((em) => (
                      <motion.button key={em} type="button" whileTap={{ scale: 1.4 }} onClick={() => { addEmoji(em); sound.playClick(); }} className="rounded-full bg-white/5 px-2.5 py-1 text-base hover:bg-white/15">{em}</motion.button>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                    <ActionButton icon={Camera} label="Front Row" onClick={() => setCamera("vip")} small />
                    <ActionButton icon={MapPin} label="Back Row" onClick={() => setCamera("back")} small />
                    <ActionButton icon={Camera} label="Stage L" onClick={() => setCamera("stage-left")} small />
                    <ActionButton icon={Camera} label="Stage R" onClick={() => setCamera("stage-right")} small />
                    <ActionButton icon={Zap} label="Arenas" onClick={() => setShowVenues((s) => !s)} small />
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </CinematicShell>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <GlassPanel className="p-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <motion.p key={value} initial={{ scale: 1.05 }} animate={{ scale: 1 }} className="text-lg font-bold tabular-nums">{value}</motion.p>
    </GlassPanel>
  );
}
