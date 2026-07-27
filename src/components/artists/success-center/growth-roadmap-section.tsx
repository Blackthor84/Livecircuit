"use client";

import { useState } from "react";
import { GROWTH_ROADMAP, ARTIST_VENUE_GUIDES } from "@/lib/demo/artist-success-center-data";
import { FadeUp, FadeUpItem, FadeUpStagger } from "@/components/demo/naming-rights/fade-up";
import { SectionHeader } from "@/components/artists/success-center/section-header";
import { cn } from "@/lib/utils";

export function GrowthRoadmapSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section id="growth-roadmap" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <SectionHeader eyebrow="Step 8" title="Artist Growth Roadmap"
          description="Your interactive path from Community Arena to Stadium — click each stage to explore milestones." />

        <FadeUpStagger>
          {GROWTH_ROADMAP.map((step, i) => {
            const venue = ARTIST_VENUE_GUIDES.find((v) => v.id === step.venueId)!;
            const isActive = activeIndex === i;
            return (
              <FadeUpItem key={step.venueId} className="relative pb-8 last:pb-0">
                {i < GROWTH_ROADMAP.length - 1 ? (
                  <div className="absolute left-6 top-14 h-[calc(100%-1.5rem)] w-px bg-gradient-to-b from-primary/60 to-transparent" />
                ) : null}
                <button type="button" onClick={() => setActiveIndex(i)} className="flex w-full gap-5 text-left">
                  <div className={cn("relative z-10 flex size-12 shrink-0 items-center justify-center rounded-2xl border text-lg font-bold transition",
                    isActive ? "border-primary bg-primary/20 text-primary" : "border-white/10 bg-white/5 text-muted-foreground")}>
                    {i + 1}
                  </div>
                  <div className={cn("glass-panel flex-1 rounded-2xl p-6 transition", isActive && "border-primary/30")}>
                    <h3 className="text-lg font-bold">{venue.name}</h3>
                    {isActive ? (
                      <ul className="mt-4 space-y-2">
                        {step.milestones.map((m) => (
                          <li key={m} className="flex gap-2 text-sm text-muted-foreground">
                            <span className="text-primary">✓</span>{m}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">{step.milestones[0]}</p>
                    )}
                    {step.graduateTo ? (
                      <p className="mt-4 text-sm font-medium text-emerald-400">↓ Then unlock {step.graduateTo}</p>
                    ) : (
                      <p className="mt-4 text-sm font-medium text-violet-400">🏆 Career pinnacle</p>
                    )}
                  </div>
                </button>
              </FadeUpItem>
            );
          })}
        </FadeUpStagger>
      </div>
    </section>
  );
}
