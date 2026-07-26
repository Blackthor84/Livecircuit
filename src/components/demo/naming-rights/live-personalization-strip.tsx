"use client";

import { motion } from "framer-motion";
import { useSponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer-context";
import { LIVE_PERSONALIZATION_ITEMS } from "@/lib/demo/sponsor-visualizer-steps";

export function LivePersonalizationStrip() {
  const { arenaName, displayCompany, resetKey } = useSponsorVisualizer();

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/40">
      <p className="border-b border-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-amber-400">
        Live personalization — updates instantly
      </p>
      <div className="flex gap-3 overflow-x-auto p-4">
        {LIVE_PERSONALIZATION_ITEMS.map((item, i) => (
          <motion.div
            key={item}
            layout
            className="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.02 }}
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{item}</p>
            <p className="mt-1 max-w-[140px] truncate text-sm font-semibold" key={resetKey}>
              {item.includes("Arena") ? arenaName : displayCompany}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
