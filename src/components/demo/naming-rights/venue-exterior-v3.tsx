"use client";

import { motion } from "framer-motion";
import { ArenaEntranceHero } from "@/components/demo/naming-rights/arena-entrance-hero";
import { SponsorBrandLogo } from "@/components/demo/naming-rights/sponsor-brand-logo";
import { useSponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer-context";
import { EVENT_TYPES } from "@/lib/demo/sponsor-visualizer-steps";
import type { BrandTheme } from "@/lib/demo/naming-rights-utils";
import { cn } from "@/lib/utils";

function CrowdLayer({ count, night }: { count: number; night: boolean }) {
  const dots = Math.min(40, Math.round(count / 1250));
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 overflow-hidden">
      {Array.from({ length: dots }).map((_, i) => (
        <motion.span
          key={i}
          className={cn("absolute bottom-2 size-1.5 rounded-full", night ? "bg-white/70" : "bg-foreground/40")}
          style={{ left: `${(i * 97) % 100}%`, bottom: `${4 + (i % 5) * 6}px` }}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: i * 0.05 }}
        />
      ))}
    </div>
  );
}

export function VenueExteriorV3({
  arenaName,
  companyName,
  theme,
  logoUrl,
  compact,
}: {
  arenaName: string;
  companyName: string;
  theme: BrandTheme;
  logoUrl?: string | null;
  compact?: boolean;
}) {
  const { form } = useSponsorVisualizer();
  const night = form.timeOfDay === "night";
  const event = EVENT_TYPES.find((e) => e.id === form.eventType);

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl border transition-all duration-700",
          night ? "border-white/10 bg-[#050510]" : "border-white/20 bg-gradient-to-b from-sky-900/40 to-background"
        )}
      >
        {night ? (
          <>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.3_0.15_280/0.5),transparent_60%)]" />
            {[20, 50, 80].map((x) => (
              <motion.div
                key={x}
                className="pointer-events-none absolute top-0 h-full w-32 opacity-20"
                style={{ left: `${x}%`, background: `linear-gradient(180deg, ${theme.primary}, transparent)` }}
                animate={{ opacity: [0.1, 0.35, 0.1] }}
                transition={{ duration: 3, repeat: Infinity, delay: x / 40 }}
              />
            ))}
            {["10%", "70%", "40%"].map((left, i) => (
              <motion.div
                key={left}
                className="pointer-events-none absolute size-1 rounded-full bg-amber-300"
                style={{ left, top: "15%" }}
                animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.7 }}
              />
            ))}
          </>
        ) : (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-400/10 to-transparent" />
        )}

        <div className="relative p-4 sm:p-6">
          <ArenaEntranceHero arenaName={arenaName} companyName={companyName} theme={theme} />
        </div>

        <CrowdLayer count={form.expectedAttendance} night={night} />

        <div className="relative grid gap-3 border-t border-white/10 p-4 sm:grid-cols-3 sm:p-6">
          {[
            { label: "Parking Sign", text: `${companyName} Parking →` },
            { label: "Digital Billboard", text: event?.label ?? "Live Tonight" },
            { label: "Street Banner", text: form.slogan || `Welcome to ${arenaName}` },
          ].map((sign) => (
            <div
              key={sign.label}
              className="rounded-xl border px-4 py-3 text-center text-sm font-semibold transition"
              style={{
                borderColor: `${theme.primary}55`,
                background: night ? `${theme.primary}18` : `${theme.primary}10`,
                boxShadow: night ? `0 0 24px ${theme.glow}` : undefined,
              }}
            >
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{sign.label}</p>
              <p className="mt-1">{sign.text}</p>
            </div>
          ))}
        </div>
      </div>

      {!compact ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {["Glass Entrance", "VIP Entrance", "Scoreboard", "Welcome Banner"].map((label) => (
            <div key={label} className="glass-panel rounded-xl p-4 text-center">
              <SponsorBrandLogo theme={theme} logoUrl={logoUrl} size="sm" className="mx-auto" />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
              <p className="mt-1 text-sm font-medium">{arenaName}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
