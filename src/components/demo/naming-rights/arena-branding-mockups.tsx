"use client";

import { DIGITAL_SPONSORSHIP_PLACEMENTS } from "@/lib/demo/digital-sponsorship-placements";
import { DigitalPlacementMockup } from "@/components/demo/naming-rights/digital-placement-mockup";
import { FadeUp, FadeUpItem, FadeUpStagger } from "@/components/demo/naming-rights/fade-up";
import type { BrandTheme } from "@/lib/demo/naming-rights-utils";
import { cn } from "@/lib/utils";

function MockupFrame({
  label,
  phase,
  children,
  className,
}: {
  label: string;
  phase?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <FadeUpItem>
      <div className={cn("glass-panel group overflow-hidden rounded-xl transition hover:border-amber-500/25", className)}>
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
          {phase ? <span className="text-[9px] uppercase text-primary/70">{phase}</span> : null}
        </div>
        <div className="p-4">{children}</div>
      </div>
    </FadeUpItem>
  );
}

export function ArenaBrandingMockups({
  companyName,
  arenaName,
  theme,
  logoUrl,
  slogan,
}: {
  companyName: string;
  arenaName: string;
  theme: BrandTheme;
  logoUrl?: string | null;
  slogan?: string;
}) {
  return (
    <FadeUpStagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {DIGITAL_SPONSORSHIP_PLACEMENTS.map((placement) => (
        <MockupFrame key={placement.id} label={placement.label} phase={placement.phase}>
          <DigitalPlacementMockup
            placementId={placement.id}
            label={placement.label}
            companyName={companyName}
            arenaName={arenaName}
            theme={theme}
            logoUrl={logoUrl}
            slogan={slogan}
          />
        </MockupFrame>
      ))}
    </FadeUpStagger>
  );
}
