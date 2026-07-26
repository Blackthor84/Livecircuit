"use client";

import { MobileAppPreview } from "@/components/demo/naming-rights/mobile-app-preview";
import { SponsorBrandLogo } from "@/components/demo/naming-rights/sponsor-brand-logo";
import { TicketMockup } from "@/components/demo/naming-rights/ticket-mockup";
import { FadeUp, FadeUpItem, FadeUpStagger } from "@/components/demo/naming-rights/fade-up";
import type { BrandTheme } from "@/lib/demo/naming-rights-utils";
import { cn } from "@/lib/utils";

function MockupFrame({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <FadeUpItem>
      <div className={cn("glass-panel group overflow-hidden rounded-xl transition hover:border-amber-500/25", className)}>
        <p className="border-b border-white/5 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <div className="p-4">{children}</div>
      </div>
    </FadeUpItem>
  );
}

export function ArenaBrandingMockups({
  companyName,
  arenaName,
  theme,
}: {
  companyName: string;
  arenaName: string;
  theme: BrandTheme;
}) {
  return (
    <FadeUpStagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <MockupFrame label="Entrance Sign">
        <div
          className="rounded-lg border-2 px-4 py-6 text-center"
          style={{ borderColor: theme.gold, background: "oklch(0.08 0.02 280)" }}
        >
          <p className="text-[9px] uppercase tracking-widest text-amber-400">LiveCircuit</p>
          <p className="mt-2 text-sm font-bold leading-tight">{arenaName}</p>
        </div>
      </MockupFrame>

      <MockupFrame label="Scoreboard">
        <div className="rounded-lg bg-neutral-950 p-4 font-mono">
          <div className="flex justify-between text-xs">
            <span className="text-emerald-400">LIVE</span>
            <span className="text-muted-foreground">Q4</span>
          </div>
          <p className="mt-3 text-center text-lg font-bold" style={{ color: theme.primary }}>
            {companyName}
          </p>
          <p className="text-center text-[10px] text-muted-foreground">Official Arena Sponsor</p>
        </div>
      </MockupFrame>

      <MockupFrame label="Digital Billboard">
        <div
          className="relative overflow-hidden rounded-lg px-4 py-8 text-center"
          style={{ background: theme.gradient }}
        >
          <p className="text-xs font-medium text-white/80">Welcome to</p>
          <p className="mt-1 text-sm font-bold text-white">{arenaName}</p>
        </div>
      </MockupFrame>

      <MockupFrame label="VIP Entrance">
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <SponsorBrandLogo theme={theme} size="sm" />
          <div>
            <p className="text-xs font-bold text-amber-400">VIP LOUNGE</p>
            <p className="text-[10px] text-muted-foreground">Presented by {companyName}</p>
          </div>
        </div>
      </MockupFrame>

      <MockupFrame label="Parking Sign">
        <div className="rounded-lg border border-white/10 bg-card/80 p-4 text-center">
          <p className="text-2xl">🅿️</p>
          <p className="mt-2 text-xs font-semibold">{arenaName}</p>
          <p className="text-[10px] text-muted-foreground">Sponsor Parking · {companyName}</p>
        </div>
      </MockupFrame>

      <MockupFrame label="Event Banner">
        <div
          className="rounded-lg px-4 py-6 text-center"
          style={{ background: `linear-gradient(135deg, ${theme.primary}30, oklch(0.12 0.02 280))` }}
        >
          <p className="text-sm font-bold">Comedy Night Live</p>
          <p className="mt-2 text-[10px]" style={{ color: theme.gold }}>
            Presented by {companyName}
          </p>
        </div>
      </MockupFrame>

      <MockupFrame label="Ticket" className="sm:col-span-1">
        <div className="scale-[0.85] origin-top">
          <TicketMockup arenaName={arenaName} theme={theme} compact />
        </div>
      </MockupFrame>

      <MockupFrame label="Website Header">
        <div className="overflow-hidden rounded-lg border border-white/10">
          <div className="px-3 py-2" style={{ background: theme.gradient }}>
            <p className="truncate text-[10px] font-semibold text-white">{arenaName}</p>
          </div>
          <div className="space-y-1 bg-background p-3">
            <div className="h-2 w-3/4 rounded bg-white/10" />
            <div className="h-2 w-1/2 rounded bg-white/5" />
          </div>
        </div>
      </MockupFrame>

      <MockupFrame label="Mobile App" className="flex justify-center">
        <div className="scale-[0.7] origin-top">
          <MobileAppPreview arenaName={arenaName} companyName={companyName} theme={theme} />
        </div>
      </MockupFrame>
    </FadeUpStagger>
  );
}
