"use client";

import { AlertTriangle } from "lucide-react";
import { useSuccessCenter } from "@/components/artists/success-center/success-center-context";
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { SectionHeader } from "@/components/artists/success-center/section-header";
import { BookingPricingBreakdown } from "@/components/pricing/artist/booking-pricing-breakdown";

export function VenueMatchStep() {
  const { venueMatch } = useSuccessCenter();
  const resetKey = venueMatch.venue.id;

  return (
    <section id="venue-match" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-8">
        <SectionHeader eyebrow="Step 4" title="AI Venue Matchmaker"
          description="Your personalized venue recommendation — powered by your audience data." />

        <FadeUp>
          <div className="glass-panel overflow-hidden rounded-3xl border-primary/30">
            <div className="bg-gradient-to-br from-primary/15 via-violet-500/10 to-transparent p-8 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Recommended Venue</p>
              <h3 className="mt-2 text-3xl font-bold sm:text-4xl">{venueMatch.venue.name}</h3>
              <p className="mt-4 max-w-2xl text-muted-foreground">{venueMatch.why}</p>
            </div>

            <div className="grid gap-px bg-white/5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Expected Attendance", value: venueMatch.expectedAttendance },
                { label: "Sell-Out Probability", value: venueMatch.sellOutProbability, suffix: "%" },
                { label: "Recommended Ticket Price", text: `$${venueMatch.recommendedPrice}` },
                { label: "Recommended Capacity", value: venueMatch.recommendedCapacity },
                { label: "Ticket Range", text: venueMatch.ticketRecommendation },
                { label: "Growth Opportunity", text: venueMatch.growthOpportunity },
              ].map((item) => (
                <div key={item.label} className="bg-card/40 p-6">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  {item.value !== undefined ? (
                    <p className="mt-2 text-2xl font-bold tabular-nums">
                      <AnimatedCounter value={item.value} format="number" resetKey={resetKey} />
                      {item.suffix ?? ""}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm font-medium leading-relaxed">{item.text}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-white/5 p-6">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-400">
                <AlertTriangle className="size-4" /> Potential Risks
              </p>
              <ul className="mt-3 space-y-2">
                {venueMatch.potentialRisks.map((risk) => (
                  <li key={risk} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="text-amber-400">!</span>{risk}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </FadeUp>

        <FadeUp>
          <BookingPricingBreakdown
            venueId={venueMatch.venue.id}
            ticketPrice={venueMatch.recommendedPrice}
            expectedAttendance={venueMatch.expectedAttendance}
          />
        </FadeUp>
      </div>
    </section>
  );
}
