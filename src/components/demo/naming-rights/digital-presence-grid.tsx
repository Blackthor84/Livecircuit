"use client";

import { motion } from "framer-motion";
import { useSponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer-context";
import { DigitalPlacementMockup } from "@/components/demo/naming-rights/digital-placement-mockup";
import { DIGITAL_SPONSORSHIP_PLACEMENTS, JOURNEY_PHASE_LABELS } from "@/lib/demo/digital-sponsorship-placements";

export function DigitalPresenceGrid() {
  const { displayCompany, arenaName, theme, form } = useSponsorVisualizer();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {DIGITAL_SPONSORSHIP_PLACEMENTS.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.03 }}
          whileHover={{ y: -4 }}
          className="glass-panel overflow-hidden rounded-2xl transition hover:border-amber-500/25"
        >
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {item.channel}
            </span>
            <span className="text-[9px] uppercase text-primary/70">{JOURNEY_PHASE_LABELS[item.phase]}</span>
          </div>
          <div className="p-4">
            <DigitalPlacementMockup
              placementId={item.id}
              label={item.label}
              companyName={displayCompany}
              arenaName={arenaName}
              theme={theme}
              logoUrl={form.logoUrl}
              slogan={form.slogan}
            />
            <p className="mt-3 font-semibold">{item.label}</p>
            <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{item.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
