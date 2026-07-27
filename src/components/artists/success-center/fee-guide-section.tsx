"use client";

import { FEE_GUIDE_ITEMS } from "@/lib/demo/artist-success-center-data";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { SectionHeader } from "@/components/artists/success-center/section-header";

export function FeeGuideSection() {
  return (
    <section id="fee-guide" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <SectionHeader eyebrow="Step 9" title="LiveCircuit Fees"
          description="Everything is free until you sell — demo values clearly labeled below." />

        <FadeUp>
          <div className="glass-panel overflow-hidden rounded-3xl">
            {FEE_GUIDE_ITEMS.map((item, i) => (
              <div key={item.item}
                className="flex flex-col gap-1 border-b border-white/5 px-6 py-5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{item.item}</p>
                  <p className="text-sm text-muted-foreground">{item.note}</p>
                </div>
                <p className={`shrink-0 text-lg font-bold ${i < 6 ? "text-emerald-400" : "text-primary"}`}>{item.cost}</p>
              </div>
            ))}
          </div>
        </FadeUp>

        <FadeUp delay={0.1} className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-center text-xs text-amber-200/80">
          Demo percentages and dollar amounts are configurable examples — not final production pricing.
        </FadeUp>
      </div>
    </section>
  );
}
