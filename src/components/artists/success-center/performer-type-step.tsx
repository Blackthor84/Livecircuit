"use client";

import { PERFORMER_TYPE_CARDS } from "@/lib/demo/artist-success-center-data";
import { useSuccessCenter } from "@/components/artists/success-center/success-center-context";
import { SectionHeader } from "@/components/artists/success-center/section-header";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { cn } from "@/lib/utils";

export function PerformerTypeStep() {
  const { performerType, setPerformerType } = useSuccessCenter();
  const selected = PERFORMER_TYPE_CARDS.find((p) => p.id === performerType)!;

  return (
    <section id="performer-type" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <SectionHeader eyebrow="Step 1" title="Performer Type"
          description="Select your category — the entire experience customizes based on your choice." />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {PERFORMER_TYPE_CARDS.map((type, i) => (
            <FadeUp key={type.id} delay={i * 0.04}>
              <button type="button" onClick={() => setPerformerType(type.id)}
                className={cn("glass-panel group w-full rounded-2xl p-6 text-left transition hover:-translate-y-1",
                  performerType === type.id ? "border-primary/50 ring-2 ring-primary/30" : "hover:border-white/20")}>
                <span className="text-3xl">{type.icon}</span>
                <h3 className="mt-4 text-lg font-semibold">{type.label}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{type.tagline}</p>
              </button>
            </FadeUp>
          ))}
        </div>

        <FadeUp delay={0.15} className="mt-8">
          <div className="glass-panel rounded-2xl border-primary/20 p-5 text-center text-sm text-muted-foreground">
            Plan customized for <span className="font-semibold text-foreground">{selected.label}</span>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
