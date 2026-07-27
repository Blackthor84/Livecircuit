"use client";

import { TICKET_SALES_TIPS } from "@/lib/demo/artist-success-center-data";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { SectionHeader } from "@/components/artists/success-center/section-header";

export function SellMoreTicketsSection() {
  return (
    <section id="sell-more" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <SectionHeader eyebrow="Step 10" title="How to Sell More Tickets"
          description="Premium strategies from successful LiveCircuit performers." />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TICKET_SALES_TIPS.map((tip, i) => (
            <FadeUp key={tip.title} delay={i * 0.04}>
              <article className="glass-panel h-full rounded-2xl p-6 transition hover:border-primary/25 hover:-translate-y-0.5">
                <span className="text-2xl">{tip.icon}</span>
                <h3 className="mt-4 font-semibold">{tip.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tip.description}</p>
              </article>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
