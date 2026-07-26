"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useSponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer-context";
import { Button } from "@/components/ui/button";

function Spotlight({ x, delay }: { x: string; delay: number }) {
  return (
    <motion.div
      className="pointer-events-none absolute top-0 h-full w-40 opacity-30"
      style={{
        left: x,
        background: "linear-gradient(180deg, oklch(0.85 0.12 85 / 0.4), transparent 70%)",
      }}
      animate={{ opacity: [0.15, 0.45, 0.15], x: [0, 20, 0] }}
      transition={{ duration: 4, repeat: Infinity, delay }}
    />
  );
}

function FanSilhouettes() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 overflow-hidden opacity-40">
      {Array.from({ length: 24 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute bottom-0 w-3 rounded-t-full bg-gradient-to-t from-white/30 to-transparent"
          style={{ left: `${(i * 4.2) % 100}%`, height: `${20 + (i % 4) * 8}px` }}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.08 }}
        />
      ))}
    </div>
  );
}

function LedScreen({ text, style }: { text: string; style?: React.CSSProperties }) {
  return (
    <motion.div
      className="rounded-lg border border-amber-500/30 bg-black/60 px-4 py-2 text-center text-xs font-bold tracking-wider text-amber-400"
      style={style}
      animate={{ opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      {text}
    </motion.div>
  );
}

export function CinematicLanding() {
  const { startBuilding } = useSponsorVisualizer();

  return (
    <section className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-hidden bg-[#030308]">
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 120% 80% at 50% 100%, oklch(0.35 0.18 280 / 0.6), transparent 60%), radial-gradient(ellipse 60% 40% at 80% 20%, oklch(0.55 0.2 85 / 0.15), transparent)",
          }}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <Spotlight x="15%" delay={0} />
        <Spotlight x="45%" delay={1.2} />
        <Spotlight x="75%" delay={0.6} />
        <FanSilhouettes />
        <motion.div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, transparent 40%, oklch(0.05 0.02 280 / 0.9) 85%)",
          }}
        />
        <LedScreen text="LIVECIRCUIT ARENA" style={{ position: "absolute", top: "18%", left: "50%", transform: "translateX(-50%)" }} />
        <LedScreen text="★ OFFICIAL SPONSOR ★" style={{ position: "absolute", top: "24%", right: "12%" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-4 py-1.5 text-sm text-amber-400"
        >
          <Sparkles className="size-4" />
          Enterprise Edition
        </motion.div>

        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          Imagine Your Company&apos;s
          <span className="mt-2 block text-gradient">Name Here</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          Experience what your brand would look like as the official sponsor of a LiveCircuit venue.
        </p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Button
            size="lg"
            className="mt-12 h-14 min-w-56 px-12 text-base shadow-xl shadow-primary/30"
            onClick={startBuilding}
          >
            Start Building
            <ArrowRight className="size-5" />
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}

/** @deprecated Use CinematicLanding */
export const IntroHero = CinematicLanding;
