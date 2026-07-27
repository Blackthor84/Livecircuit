"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SUCCESS_CENTER_FAQ } from "@/lib/demo/artist-success-center-data";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { SectionHeader } from "@/components/artists/success-center/section-header";
import { cn } from "@/lib/utils";

export function SuccessCenterFaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          eyebrow="Step 12"
          title="Common Questions"
          description="Answers to common questions about payouts, pricing, and growing on LiveCircuit."
        />

        <div className="space-y-3">
          {SUCCESS_CENTER_FAQ.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <FadeUp key={item.q} delay={i * 0.04}>
                <div className="glass-panel overflow-hidden rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="font-semibold">{item.q}</span>
                    <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition", isOpen && "rotate-180")} />
                  </button>
                  <div className={cn("grid transition-all duration-300", isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                    <div className="overflow-hidden">
                      <p className="border-t border-white/5 px-5 pb-5 pt-0 text-sm text-muted-foreground">{item.a}</p>
                    </div>
                  </div>
                </div>
              </FadeUp>
            );
          })}
        </div>
      </div>
    </section>
  );
}
