"use client";

import { REVENUE_TIMELINE } from "@/lib/demo/artist-success-center-data";
import { FadeUp, FadeUpItem, FadeUpStagger } from "@/components/demo/naming-rights/fade-up";
import { SectionHeader } from "@/components/artists/success-center/section-header";

export function RevenueTimelineSection() {
  return (
    <section id="revenue-timeline" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          eyebrow="Step 11"
          title="Revenue Timeline"
          description="From ticket sales to funds deposited — here's how money flows."
        />

        <FadeUpStagger>
          {REVENUE_TIMELINE.map((step, i) => (
            <FadeUpItem key={step.title} className="relative flex gap-5 pb-8 last:pb-0">
              {i < REVENUE_TIMELINE.length - 1 ? (
                <div className="absolute left-[23px] top-12 h-[calc(100%-1rem)] w-px bg-gradient-to-b from-primary/50 to-transparent" />
              ) : null}
              <div className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl">
                {step.icon}
              </div>
              <div className="glass-panel flex-1 rounded-2xl p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Phase {step.step}</p>
                <h3 className="mt-1 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              </div>
            </FadeUpItem>
          ))}
        </FadeUpStagger>
      </div>
    </section>
  );
}
