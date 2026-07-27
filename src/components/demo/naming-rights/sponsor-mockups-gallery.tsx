"use client";

import { FadeUp, FadeUpItem, FadeUpStagger } from "@/components/demo/naming-rights/fade-up";
import { DigitalPlacementMockup } from "@/components/demo/naming-rights/digital-placement-mockup";
import { useSponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer-context";
import { DIGITAL_SPONSORSHIP_PLACEMENTS } from "@/lib/demo/digital-sponsorship-placements";

export function SponsorMockupsGallery() {
  const { displayCompany, arenaName, theme, form } = useSponsorVisualizer();

  return (
    <FadeUpStagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {DIGITAL_SPONSORSHIP_PLACEMENTS.map((placement) => (
        <FadeUpItem key={placement.id}>
          <div className="glass-panel group overflow-hidden rounded-xl transition hover:-translate-y-0.5 hover:border-amber-500/25">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {placement.label}
              </p>
              <span className="text-[9px] uppercase text-primary/60">{placement.channel}</span>
            </div>
            <div className="p-4">
              <DigitalPlacementMockup
                placementId={placement.id}
                label={placement.label}
                companyName={displayCompany}
                arenaName={arenaName}
                theme={theme}
                logoUrl={form.logoUrl}
                slogan={form.slogan}
              />
              <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">{placement.description}</p>
            </div>
          </div>
        </FadeUpItem>
      ))}
    </FadeUpStagger>
  );
}
