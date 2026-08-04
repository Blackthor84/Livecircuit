"use client";

import { motion } from "framer-motion";

export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,oklch(0.35_0.2_280/0.35),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_80%,oklch(0.3_0.15_220/0.2),transparent_50%)]" />
      {Array.from({ length: 40 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute size-1 rounded-full bg-primary/40"
          style={{ left: `${(i * 17) % 100}%`, top: `${(i * 23) % 100}%` }}
          animate={{
            opacity: [0.1, 0.6, 0.1],
            y: [0, -30 - (i % 5) * 10, 0],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{ duration: 4 + (i % 6), repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={`beam-${i}`}
          className="absolute h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent"
          style={{ top: `${20 + i * 25}%` }}
          animate={{ opacity: [0.1, 0.4, 0.1], x: ["-10%", "10%", "-10%"] }}
          transition={{ duration: 8 + i * 2, repeat: Infinity }}
        />
      ))}
    </div>
  );
}
