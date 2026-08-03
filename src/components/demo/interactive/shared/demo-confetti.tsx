"use client";

import { motion } from "framer-motion";

const COLORS = ["#a855f7", "#6366f1", "#22d3ee", "#fbbf24", "#f472b6", "#34d399"];

export function DemoConfetti({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {Array.from({ length: 48 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute block size-2 rounded-sm"
          style={{
            left: `${10 + (i * 17) % 80}%`,
            top: "-5%",
            backgroundColor: COLORS[i % COLORS.length],
          }}
          initial={{ y: 0, opacity: 1, rotate: 0 }}
          animate={{
            y: "110vh",
            opacity: [1, 1, 0],
            rotate: 360 + i * 30,
            x: (i % 2 === 0 ? 1 : -1) * (40 + (i % 5) * 20),
          }}
          transition={{ duration: 2.5 + (i % 4) * 0.3, delay: i * 0.04, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
