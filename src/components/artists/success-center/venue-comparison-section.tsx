"use client";

import { ARTIST_VENUE_GUIDES } from "@/lib/demo/artist-success-center-data";
import { VenueComparePanel } from "@/components/artists/success-center/venue-compare-panel";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { SectionHeader } from "@/components/artists/success-center/section-header";
import { cn } from "@/lib/utils";

const RISK_COLORS: Record<string, string> = {
  Low: "text-emerald-400",
  Moderate: "text-yellow-400",
  High: "text-orange-400",
  "Very High": "text-red-400",
};

export function VenueComparisonSection() {
  return (
    <section id="venue-comparison" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <SectionHeader eyebrow="Step 5" title="Venue Comparison"
          description="Compare every LiveCircuit venue tier — capacity, atmosphere, risk, and growth potential." />

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {ARTIST_VENUE_GUIDES.map((venue, i) => (
            <FadeUp key={venue.id} delay={i * 0.05}>
              <article className="glass-panel h-full rounded-3xl p-6 transition hover:border-primary/25">
                <h3 className="text-xl font-bold">{venue.name}</h3>
                <dl className="mt-5 space-y-2.5 text-sm">
                  {[
                    ["Capacity", venue.capacity.toLocaleString()],
                    ["Recommended Performer", venue.recommendedPerformer],
                    ["Avg. Attendance", venue.typicalAttendance.toLocaleString()],
                    ["Ticket Range", venue.typicalTicketPrices],
                    ["Production Level", venue.productionLevel],
                    ["Atmosphere", venue.atmosphere],
                    ["Audience Size", venue.audienceSize],
                    ["Risk Level", venue.riskLevel],
                    ["Growth Potential", venue.growthPotential],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 border-b border-white/5 pb-2">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className={cn("text-right font-medium", label === "Risk Level" && RISK_COLORS[value as string])}>{value}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            </FadeUp>
          ))}
        </div>

        <FadeUp delay={0.2} className="mt-16">
          <VenueComparePanel embedded />
        </FadeUp>
      </div>
    </section>
  );
}
