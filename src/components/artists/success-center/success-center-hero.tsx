"use client";

import { MapPin, Sparkles } from "lucide-react";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { Button } from "@/components/ui/button";

export function SuccessCenterHero() {
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="relative overflow-hidden px-4 pb-24 pt-20 sm:px-6 sm:pt-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[560px] w-[840px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[140px]" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-emerald-500/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-4xl text-center">
        <FadeUp>
          <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-5 py-2 text-sm text-violet-200">
            <Sparkles className="size-4" />
            Artist Success Center Enterprise
          </div>
        </FadeUp>

        <FadeUp delay={0.05}>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Every Great Tour
            <span className="block bg-gradient-to-r from-violet-200 via-primary to-emerald-300 bg-clip-text text-transparent">
              Starts Somewhere.
            </span>
          </h1>
        </FadeUp>

        <FadeUp delay={0.1}>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Whether you&apos;re performing for 50 fans or 50,000, LiveCircuit helps you choose the right
            digital venue, price your tickets transparently, keep 100% of merch and tips, and build a loyal audience.
          </p>
        </FadeUp>

        <FadeUp delay={0.15} className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" onClick={() => scrollTo("performer-type")} className="gap-2 px-8">
            <Sparkles className="size-4" />
            Start My Success Plan
          </Button>
          <Button size="lg" variant="outline" onClick={() => scrollTo("venue-comparison")} className="gap-2 px-8">
            <MapPin className="size-4" />
            Compare Venues
          </Button>
        </FadeUp>
      </div>
    </section>
  );
}
