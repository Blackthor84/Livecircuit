"use client";

import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { SponsorBrandLogo } from "@/components/demo/naming-rights/sponsor-brand-logo";
import { useSponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer-context";
import { WALKTHROUGH_SCENES } from "@/lib/demo/sponsor-visualizer-steps";

export function VenueWalkthrough() {
  const { displayCompany, arenaName, theme, form } = useSponsorVisualizer();

  return (
    <div className="relative mx-auto max-w-3xl">
      <div className="absolute left-4 top-0 hidden h-full w-px bg-gradient-to-b from-primary via-amber-500/50 to-transparent sm:block md:left-1/2" />
      <div className="space-y-16">
        {WALKTHROUGH_SCENES.map((scene, i) => (
          <FadeUp key={scene.id} delay={i * 0.04}>
            <div className={`relative flex flex-col gap-6 sm:flex-row ${i % 2 === 1 ? "sm:flex-row-reverse" : ""}`}>
              <div className="flex shrink-0 items-start gap-4 sm:w-1/2 sm:justify-end sm:pr-8 md:justify-center">
                <div className="glass-panel w-full max-w-sm rounded-2xl p-6">
                  <span className="text-3xl">{scene.icon}</span>
                  <h3 className="mt-4 text-xl font-bold">{scene.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{scene.description}</p>
                  <p className="mt-4 text-xs font-medium" style={{ color: theme.gold }}>
                    Presented by {displayCompany}
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex sm:w-1/2 sm:items-center sm:justify-center">
                <div
                  className="flex size-14 items-center justify-center rounded-full border-2 bg-background text-lg font-bold shadow-lg"
                  style={{ borderColor: theme.primary, boxShadow: `0 0 20px ${theme.glow}` }}
                >
                  {i + 1}
                </div>
              </div>
              <div className="sm:w-1/2 sm:pl-8">
                <div
                  className="glass-panel overflow-hidden rounded-2xl p-5"
                  style={{ background: `linear-gradient(135deg, ${theme.primary}12, transparent)` }}
                >
                  <div className="flex items-center gap-3">
                    <SponsorBrandLogo theme={theme} logoUrl={form.logoUrl} size="sm" />
                    <div>
                      <p className="text-sm font-semibold">{arenaName}</p>
                      <p className="text-xs text-muted-foreground">{scene.name}</p>
                    </div>
                  </div>
                  <div
                    className="mt-4 rounded-lg border px-3 py-6 text-center text-sm font-medium"
                    style={{ borderColor: `${theme.gold}44` }}
                  >
                    {form.slogan || `${displayCompany} · Official Venue Partner`}
                  </div>
                </div>
              </div>
            </div>
          </FadeUp>
        ))}
      </div>
    </div>
  );
}
