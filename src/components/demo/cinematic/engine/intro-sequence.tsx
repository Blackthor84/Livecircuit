"use client";

import { motion } from "framer-motion";
import { LiveCircuitLogo } from "@/components/brand/livecircuit-logo";
import { TunnelScene } from "@/components/demo/cinematic/shared/virtual-arena";

export function CinematicIntro({
  connectMessage,
  tunnelProgress,
  phase,
}: {
  connectMessage: string;
  tunnelProgress: number;
  phase: "logo" | "tunnel";
}) {
  if (phase === "logo") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full flex-col items-center justify-center bg-black px-6 text-center">
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}>
          <LiveCircuitLogo className="mx-auto h-10 sm:h-12" />
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-10 text-base text-muted-foreground sm:text-lg">
          {connectMessage}
        </motion.p>
        <motion.div className="mt-8 flex gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>
          {[0, 1, 2].map((i) => (
            <motion.div key={i} className="size-2 rounded-full bg-primary" animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.3, 0.8] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }} />
          ))}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="relative h-full">
      <TunnelScene progress={tunnelProgress} />
      <motion.p className="absolute inset-x-0 bottom-24 text-center text-xs font-semibold uppercase tracking-[0.35em] text-primary" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2.5, repeat: Infinity }}>
        The crowd is waiting
      </motion.p>
    </div>
  );
}

export function DemoEntryScreen({
  title,
  subtitle,
  cta,
  onEnter,
}: {
  title: string;
  subtitle: string;
  cta: string;
  onEnter: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full flex-col items-center justify-center px-6 text-center">
      <LiveCircuitLogo className="h-10 sm:h-12" />
      <p className="mt-10 text-xs font-bold uppercase tracking-[0.35em] text-primary">LiveCircuit</p>
      <h1 className="mt-4 max-w-xl text-3xl font-bold tracking-tight sm:text-5xl">
        <span className="text-gradient">{title}</span>
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">{subtitle}</p>
      <motion.button
        type="button"
        onClick={onEnter}
        whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(168,85,247,0.4)" }}
        whileTap={{ scale: 0.97 }}
        className="mt-12 rounded-full bg-gradient-to-r from-primary to-accent px-14 py-4 text-base font-bold tracking-wide shadow-2xl shadow-primary/30 sm:text-lg"
      >
        {cta}
      </motion.button>
    </motion.div>
  );
}
