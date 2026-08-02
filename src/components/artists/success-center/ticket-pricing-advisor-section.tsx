"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { ARTIST_VENUE_GUIDES, type ArtistVenueId } from "@/lib/demo/artist-success-center-data";
import { calculatePricingAdvisor } from "@/lib/demo/artist-success-center-utils";
import { useSuccessCenter } from "@/components/artists/success-center/success-center-context";
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { SectionHeader } from "@/components/artists/success-center/section-header";
import { cn } from "@/lib/utils";

export function TicketPricingAdvisorSection() {
  const { venueMatch, artistPricing, pricingSnapshot } = useSuccessCenter();
  const platformFeeRate = artistPricing.platformFeePercentage / 100;
  const [venueId, setVenueId] = useState<ArtistVenueId>(venueMatch.venue.id);
  const [expectedAttendance, setExpectedAttendance] = useState(venueMatch.expectedAttendance);
  const [ticketPrice, setTicketPrice] = useState(venueMatch.recommendedPrice);
  const [marketingBudget, setMarketingBudget] = useState(500);

  const venue = ARTIST_VENUE_GUIDES.find((v) => v.id === venueId)!;
  const resetKey = `${venueId}-${expectedAttendance}-${ticketPrice}-${marketingBudget}`;

  const result = useMemo(
    () =>
      calculatePricingAdvisor({
        venueId,
        expectedAttendance,
        ticketPrice,
        marketingBudget,
        platformFeeRate,
        snapshot: pricingSnapshot,
      }),
    [venueId, expectedAttendance, ticketPrice, marketingBudget, platformFeeRate, pricingSnapshot]
  );

  const isWarning = result.recommendation !== "competitive";

  return (
    <section id="pricing-advisor" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <SectionHeader eyebrow="Step 6" title="Smart Pricing Advisor"
          description="Model revenue, fees, taxes, and break-even before you publish." />

        <FadeUp>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="glass-panel space-y-6 rounded-3xl p-6 sm:p-8">
              <fieldset>
                <legend className="mb-3 text-sm font-semibold">Venue</legend>
                <select value={venueId} onChange={(e) => setVenueId(e.target.value as ArtistVenueId)}
                  className="w-full rounded-xl border border-white/10 bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary/50">
                  {ARTIST_VENUE_GUIDES.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
                </select>
              </fieldset>
              {[
                { label: "Ticket Price", value: ticketPrice, min: 5, max: 300, step: 1, set: setTicketPrice, display: `$${ticketPrice}` },
                { label: "Expected Attendance", value: expectedAttendance, min: 25, max: venue.capacity, step: 25, set: setExpectedAttendance, display: expectedAttendance.toLocaleString() },
                { label: "Marketing Budget", value: marketingBudget, min: 0, max: 10000, step: 100, set: setMarketingBudget, display: `$${marketingBudget.toLocaleString()}` },
              ].map((s) => (
                <fieldset key={s.label}>
                  <legend className="mb-3 text-sm font-semibold">{s.label}: <span className="text-primary">{s.display}</span></legend>
                  <input type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                    onChange={(e) => s.set(Number(e.target.value))} className="w-full accent-primary" />
                </fieldset>
              ))}
            </div>

            <div className="space-y-4">
              <div className="glass-panel rounded-3xl p-6 sm:p-8">
                <dl className="space-y-4">
                  {[
                    { label: "Gross Revenue", value: result.grossRevenue },
                    { label: "Booking Fee", value: result.bookingFee, muted: true },
                    { label: `${artistPricing.platformFeeLabel} (${artistPricing.platformFeePercentage}%)`, value: result.platformFee, muted: true },
                    { label: "Payment Processing", value: result.processingFees, muted: true },
                    { label: "Taxes", value: result.taxes, muted: true },
                    { label: "Net Earnings", value: result.netEarnings, highlight: true },
                    { label: "Venue Fill %", value: result.venueFillPercent, suffix: "%" },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between border-b border-white/5 pb-3">
                      <dt className={cn("text-sm", row.muted && "text-muted-foreground")}>{row.label}</dt>
                      <dd className={cn("font-bold tabular-nums", row.highlight && "text-primary text-lg")}>
                        {row.suffix ? (<><AnimatedCounter value={row.value} format="number" resetKey={resetKey} />{row.suffix}</>) : <>${<AnimatedCounter value={Math.round(row.value)} format="number" resetKey={resetKey} />}</>}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-6 rounded-xl bg-white/5 p-4">
                  <p className="text-xs text-muted-foreground">Break-even Point (demo)</p>
                  <p className="text-2xl font-bold tabular-nums">
                    <AnimatedCounter value={result.breakEvenPoint} format="number" resetKey={resetKey} /> tickets
                  </p>
                </div>
              </div>

              <div className={cn("flex gap-3 rounded-2xl border p-5",
                isWarning ? "border-amber-500/30 bg-amber-500/10" : "border-emerald-500/30 bg-emerald-500/10")}>
                {isWarning ? <AlertCircle className="size-5 shrink-0 text-amber-400" /> : <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />}
                <div>
                  <p className="text-sm font-semibold">Recommendation</p>
                  <p className="mt-1 text-sm text-muted-foreground">{result.recommendationText}</p>
                  {result.alternateSuggestion ? <p className="mt-2 text-sm text-primary/90">{result.alternateSuggestion}</p> : null}
                </div>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
