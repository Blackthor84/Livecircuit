"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function DemoStadiumBackground({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 50% 100%, oklch(0.35 0.22 280 / 0.5), transparent 55%), radial-gradient(ellipse 50% 40% at 20% 30%, oklch(0.45 0.18 220 / 0.25), transparent), radial-gradient(ellipse 40% 35% at 85% 25%, oklch(0.55 0.2 185 / 0.2), transparent)",
        }}
        animate={{ scale: [1, 1.02, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute top-0 h-full w-24 opacity-20"
          style={{
            left: `${15 + i * 18}%`,
            background: "linear-gradient(180deg, oklch(0.75 0.15 280 / 0.5), transparent 65%)",
          }}
          animate={{ opacity: [0.1, 0.35, 0.1], x: [0, 12, 0] }}
          transition={{ duration: 3.5 + i * 0.5, repeat: Infinity, delay: i * 0.4 }}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background via-background/80 to-transparent" />
    </div>
  );
}
