"use client";

import { motion } from "framer-motion";
import { SponsorBrandLogo } from "@/components/demo/naming-rights/sponsor-brand-logo";
import { useSponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer-context";
import { DIGITAL_PRESENCE_MOCKUPS } from "@/lib/demo/sponsor-visualizer-steps";

export function DigitalPresenceGrid() {
  const { displayCompany, arenaName, theme, form } = useSponsorVisualizer();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {DIGITAL_PRESENCE_MOCKUPS.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.03 }}
          whileHover={{ y: -4 }}
          className="glass-panel overflow-hidden rounded-2xl transition hover:border-amber-500/25"
        >
          <div className="border-b border-white/5 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {item.channel}
          </div>
          <div className="p-4">
            <div className="mb-3 aspect-video rounded-lg p-3" style={{ background: theme.gradient }}>
              <SponsorBrandLogo theme={theme} logoUrl={form.logoUrl} size="sm" />
            </div>
            <p className="font-semibold">{item.label}</p>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {form.slogan || `${displayCompany} · ${arenaName}`}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
