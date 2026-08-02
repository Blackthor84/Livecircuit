"use client";

import { ArrowRight } from "lucide-react";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { SectionHeader } from "@/components/artists/success-center/section-header";
import {
  CreatorPromiseCards,
  CreatorPromiseComparison,
  CreatorPromiseFaq,
  CreatorPromiseTagline,
  PlanIncludedPromises,
} from "@/components/marketing/creator-promise-sections";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants";
import { ARTIST_FIRST_HOMEPAGE, TRUST_SECTION } from "@/lib/home/creator-promise-content";
import { ARTIST_BOOKING_PRICING } from "@/lib/pricing/livecircuit-pricing";

export function CreatorPromiseSection() {
  return (
    <section id="creator-promise" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-12">
        <SectionHeader
          eyebrow="Artist First"
          title="The LiveCircuit Creator Promise"
          description="We make money by helping artists grow—not by taking money directly from artists."
        />

        <FadeUp>
          <CreatorPromiseCards compact />
        </FadeUp>

        <FadeUp>
          <CreatorPromiseTagline />
        </FadeUp>

        <FadeUp>
          <Card className="glass-panel border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Always included — free to join</CardTitle>
            </CardHeader>
            <CardContent>
              <PlanIncludedPromises />
            </CardContent>
          </Card>
        </FadeUp>

        <FadeUp>
          <div className="glass-panel rounded-3xl border border-white/10 p-6 sm:p-8">
            <h3 className="text-xl font-semibold">{ARTIST_FIRST_HOMEPAGE.revenueTitle}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{ARTIST_BOOKING_PRICING.transparencyMessage}</p>
          </div>
        </FadeUp>

        <FadeUp>
          <h3 className="text-xl font-semibold">Why artists choose LiveCircuit</h3>
          <div className="mt-6 overflow-x-auto">
            <CreatorPromiseComparison />
          </div>
        </FadeUp>

        <FadeUp>
          <div className="glass-panel rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 sm:p-8">
            <h3 className="text-xl font-semibold">{TRUST_SECTION.title}</h3>
            <p className="mt-3 text-sm text-muted-foreground">{TRUST_SECTION.body}</p>
          </div>
        </FadeUp>

        <FadeUp>
          <h3 className="text-xl font-semibold">Creator Promise FAQ</h3>
          <div className="mt-6">
            <CreatorPromiseFaq limit={4} />
          </div>
        </FadeUp>

        <FadeUp className="flex justify-center">
          <Button href={ROUTES.creatorPromise} variant="outline" className="gap-2">
            Read the full Creator Promise
            <ArrowRight className="size-4" />
          </Button>
        </FadeUp>
      </div>
    </section>
  );
}
