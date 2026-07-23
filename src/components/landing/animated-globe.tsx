"use client";

import { motion } from "framer-motion";

export function AnimatedGlobe() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-md">
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/40 via-accent/30 to-transparent blur-2xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.85, 0.6] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-[8%] rounded-full border border-white/10 bg-gradient-to-b from-white/10 to-transparent shadow-[inset_0_0_60px_oklch(0.72_0.19_300/0.35)]"
        animate={{ rotate: 360 }}
        transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute inset-0 rounded-full opacity-60 [background-image:radial-gradient(circle_at_30%_30%,oklch(0.65_0.16_165/0.5)_0%,transparent_45%),repeating-linear-gradient(90deg,transparent,transparent_18px,rgba(255,255,255,0.04)_18px,rgba(255,255,255,0.04)_19px)]" />
      </motion.div>
      {[...Array(6)].map((_, i) => (
        <motion.span
          key={i}
          className="absolute size-2 rounded-full bg-accent shadow-[0_0_12px_oklch(0.65_0.16_165)]"
          style={{
            top: `${20 + (i * 11) % 60}%`,
            left: `${15 + (i * 17) % 70}%`,
          }}
          animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}
