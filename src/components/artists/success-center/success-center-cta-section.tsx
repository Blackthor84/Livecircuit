"use client";

import { ArrowRight, CalendarPlus, MapPin, Search } from "lucide-react";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

export function SuccessCenterCtaSection() {
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section id="ready-to-book" className="scroll-mt-24 px-4 py-24 sm:px-6">
      <FadeUp>
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-primary/30 bg-gradient-to-br from-primary/20 via-violet-500/10 to-transparent p-10 text-center sm:p-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_60%)]" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Step 15</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Let&apos;s Build Your Next Sold-Out Show.
            </h2>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" href={ROUTES.venues} className="gap-2 px-8">
                <MapPin className="size-4" /> Browse Venues
              </Button>
              <Button size="lg" variant="secondary" href={ROUTES.artistEventsNew} className="gap-2 px-8">
                <CalendarPlus className="size-4" /> Book My First Show
              </Button>
              <Button size="lg" variant="outline" onClick={() => scrollTo("venue-match")} className="gap-2 px-8">
                <Search className="size-4" /> Find My Perfect Venue
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </FadeUp>
    </section>
  );
}
