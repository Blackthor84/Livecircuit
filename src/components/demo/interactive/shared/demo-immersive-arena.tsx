"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, ShoppingBag, Stamp } from "lucide-react";
import { CHAT_MESSAGES } from "@/lib/demo/interactive/data";
import { cn } from "@/lib/utils";

type ArenaPhase = "enter" | "dim" | "crowd" | "lights" | "music" | "chat" | "merch" | "vip" | "passport";

const PHASE_ORDER: ArenaPhase[] = ["enter", "dim", "crowd", "lights", "music", "chat", "merch", "vip", "passport"];

const FLOATING_EMOJIS = ["🔥", "❤️", "🎉", "👏", "🤘", "✨", "💜", "🎸"];

export function DemoImmersiveArena({
  artistName,
  onPhaseChange,
  onComplete,
}: {
  artistName: string;
  onPhaseChange?: (phase: ArenaPhase) => void;
  onComplete?: () => void;
}) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [chatLines, setChatLines] = useState<typeof CHAT_MESSAGES>([]);
  const [floaters, setFloaters] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [merchPurchased, setMerchPurchased] = useState(false);
  const [pan, setPan] = useState(0);

  const phase = PHASE_ORDER[phaseIndex] ?? "passport";
  const dimLevel = phaseIndex >= 1 ? 0.85 : 0.3;
  const showCrowd = phaseIndex >= 2;
  const showSpotlights = phaseIndex >= 3;
  const showStageLights = phaseIndex >= 4;
  const showMusic = phaseIndex >= 5;
  const showChat = phaseIndex >= 5;
  const showMerch = phaseIndex >= 6;
  const showVip = phaseIndex >= 7;
  const showPassport = phaseIndex >= 8;

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  useEffect(() => {
    const panInterval = setInterval(() => setPan((p) => p + 1), 50);
    return () => clearInterval(panInterval);
  }, []);

  useEffect(() => {
    if (!showChat) return;
    let i = 0;
    const interval = setInterval(() => {
      setChatLines((prev) => [...prev.slice(-6), CHAT_MESSAGES[i % CHAT_MESSAGES.length]!]);
      i++;
    }, 1800);
    return () => clearInterval(interval);
  }, [showChat]);

  useEffect(() => {
    if (!showMusic) return;
    const interval = setInterval(() => {
      setFloaters((prev) => [
        ...prev.slice(-12),
        { id: Date.now(), emoji: FLOATING_EMOJIS[Math.floor(Math.random() * FLOATING_EMOJIS.length)]!, x: 10 + Math.random() * 80 },
      ]);
    }, 600);
    return () => clearInterval(interval);
  }, [showMusic]);

  useEffect(() => {
    if (phaseIndex >= PHASE_ORDER.length - 1) return;
    const delays = [800, 1200, 1000, 1000, 1500, 3000, 2500, 2000, 4000];
    const t = setTimeout(() => setPhaseIndex((i) => Math.min(i + 1, PHASE_ORDER.length - 1)), delays[phaseIndex] ?? 2000);
    return () => clearTimeout(t);
  }, [phaseIndex]);

  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-black">
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: 1 - dimLevel * 0.7 }}
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% 25%, oklch(0.45 0.28 280 / 0.7), transparent), radial-gradient(ellipse 70% 50% at 50% 90%, oklch(0.15 0.08 280), black)",
          transform: `perspective(900px) rotateY(${Math.sin(pan * 0.02) * 6}deg)`,
        }}
      />

      {showSpotlights &&
        [0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="pointer-events-none absolute bottom-[38%] left-1/2 h-40 w-1 origin-bottom bg-gradient-to-t from-amber-300/70 to-transparent"
            style={{ marginLeft: -2 }}
            animate={{ rotate: [-35 + i * 22, -25 + i * 22, -35 + i * 22], opacity: [0.3, 0.9, 0.3] }}
            transition={{ duration: 2 + i * 0.4, repeat: Infinity }}
          />
        ))}

      <div className="absolute inset-x-[12%] bottom-[36%] h-[28%] rounded-t-2xl border border-white/10 bg-gradient-to-b from-violet-900/90 to-violet-950">
        {showStageLights && (
          <motion.div
            className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-r from-cyan-400 via-primary to-amber-400"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
        {showMusic && (
          <div className="absolute inset-x-4 top-3 flex items-end justify-center gap-1">
            {Array.from({ length: 16 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-1 rounded-t bg-primary/80"
                animate={{ height: [8, 24 + (i % 5) * 8, 8] }}
                transition={{ duration: 0.4 + (i % 4) * 0.1, repeat: Infinity }}
              />
            ))}
          </div>
        )}
        <p className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white/90 sm:text-2xl">{artistName} LIVE</p>
      </div>

      {showCrowd && (
        <div className="absolute inset-x-0 bottom-0 flex h-[32%] items-end justify-center gap-px px-1">
          {Array.from({ length: 72 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-1 rounded-t bg-gradient-to-t from-primary/70 to-primary/20"
              animate={{ height: [`${12 + (i % 8) * 3}px`, `${22 + (i % 6) * 5}px`, `${12 + (i % 8) * 3}px`] }}
              transition={{ duration: 0.5 + (i % 10) * 0.05, repeat: Infinity }}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {floaters.map((f) => (
          <motion.span
            key={f.id}
            className="pointer-events-none absolute bottom-[40%] text-2xl"
            style={{ left: `${f.x}%` }}
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -120, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5 }}
          >
            {f.emoji}
          </motion.span>
        ))}
      </AnimatePresence>

      {showChat && (
        <div className="absolute bottom-4 left-4 max-h-32 w-48 overflow-hidden rounded-xl border border-white/10 bg-black/70 p-3 backdrop-blur-md sm:w-56">
          <AnimatePresence mode="popLayout">
            {chatLines.map((c, i) => (
              <motion.p
                key={`${c.user}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[10px] text-white/80 sm:text-xs"
              >
                <span className="font-semibold text-primary">{c.user}</span>: {c.message} {c.emoji}
              </motion.p>
            ))}
          </AnimatePresence>
        </div>
      )}

      {showMerch && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          className="absolute right-0 top-0 flex h-full w-44 flex-col border-l border-white/10 bg-black/80 p-4 backdrop-blur-xl sm:w-52"
        >
          <ShoppingBag className="size-5 text-primary" />
          <p className="mt-2 text-sm font-bold">Merch Booth</p>
          <p className="mt-1 text-xs text-muted-foreground">Tour Tee — $35</p>
          {!merchPurchased ? (
            <button
              type="button"
              onClick={() => setMerchPurchased(true)}
              className="mt-4 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Buy Now
            </button>
          ) : (
            <motion.p initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="mt-4 text-xs font-semibold text-emerald-400">
              ✓ Added to bag
            </motion.p>
          )}
        </motion.div>
      )}

      {showVip && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-300"
        >
          <Crown className="size-3.5" /> VIP Lounge Unlocked
        </motion.div>
      )}

      {showPassport && (
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <div className="text-center">
            <motion.div
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 0.6 }}
              className="mx-auto flex size-24 items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-gradient-to-br from-primary/30 to-accent/20"
            >
              <Stamp className="size-10 text-primary" />
            </motion.div>
            <p className="mt-4 text-xl font-bold">Passport Stamp Earned</p>
            <p className="mt-1 text-sm text-muted-foreground">{artistName} · Live Show</p>
            <button
              type="button"
              onClick={onComplete}
              className="mt-6 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground"
            >
              Continue Exploring
            </button>
          </div>
        </motion.div>
      )}

      <motion.div
        className="pointer-events-none absolute inset-0 bg-black"
        animate={{ opacity: phase === "dim" ? 0.6 : 0 }}
        transition={{ duration: 1.2 }}
      />
    </div>
  );
}
