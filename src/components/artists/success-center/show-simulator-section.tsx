"use client";

import { useMemo, useState } from "react";
import { ARTIST_VENUE_GUIDES, type ArtistVenueId } from "@/lib/demo/artist-success-center-data";
import { simulateShow } from "@/lib/demo/artist-success-center-utils";
import { useSuccessCenter } from "@/components/artists/success-center/success-center-context";
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { SectionHeader } from "@/components/artists/success-center/section-header";
import { cn } from "@/lib/utils";

export function ShowSimulatorSection() {
  const { activeAudience, venueMatch } = useSuccessCenter();
  const [followers, setFollowers] = useState(activeAudience);
  const [venueId, setVenueId] = useState<ArtistVenueId>(venueMatch.venue.id);
  const [ticketPrice, setTicketPrice] = useState(venueMatch.recommendedPrice);
  const [marketingSpend, setMarketingSpend] = useState(500);
  const [conversionRate, setConversionRate] = useState(8);

  const resetKey = `${followers}-${venueId}-${ticketPrice}-${marketingSpend}-${conversionRate}`;

  const result = useMemo(
    () => simulateShow({ followers, ticketPrice, venueId, conversionRate, marketingBudget: marketingSpend }),
    [followers, ticketPrice, venueId, conversionRate, marketingSpend]
  );

  const venue = ARTIST_VENUE_GUIDES.find((v) => v.id === venueId)!;

  return (
    <section id="show-simulator" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <SectionHeader eyebrow="Step 7" title="Show Success Simulator"
          description="Project tickets sold, profit, audience growth, and future booking potential." />

        <FadeUp>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="glass-panel space-y-6 rounded-3xl p-6 sm:p-8">
              {[
                { label: "Followers", value: followers, min: 100, max: 200000, step: 100, set: setFollowers, display: followers.toLocaleString() },
                { label: "Ticket Price", value: ticketPrice, min: 5, max: 200, step: 1, set: setTicketPrice, display: `$${ticketPrice}` },
                { label: "Marketing Spend", value: marketingSpend, min: 0, max: 10000, step: 100, set: setMarketingSpend, display: `$${marketingSpend.toLocaleString()}` },
                { label: "Conversion Rate", value: conversionRate, min: 1, max: 25, step: 0.5, set: setConversionRate, display: `${conversionRate}%` },
              ].map((s) => (
                <fieldset key={s.label}>
                  <legend className="mb-3 text-sm font-semibold">{s.label}: <span className="text-primary">{s.display}</span></legend>
                  <input type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                    onChange={(e) => s.set(Number(e.target.value))} className="w-full accent-primary" />
                </fieldset>
              ))}
              <fieldset>
                <legend className="mb-3 text-sm font-semibold">Venue</legend>
                <select value={venueId} onChange={(e) => setVenueId(e.target.value as ArtistVenueId)}
                  className="w-full rounded-xl border border-white/10 bg-background/60 px-4 py-3 text-sm outline-none">
                  {ARTIST_VENUE_GUIDES.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
                </select>
              </fieldset>
            </div>

            <div className="space-y-4">
              <div className="glass-panel rounded-3xl p-6 sm:p-8">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Tickets Sold", value: result.ticketsSold },
                    { label: "Venue Fill %", value: result.venueFilledPercent, suffix: "%" },
                    { label: "Revenue", value: result.grossRevenue, prefix: "$" },
                    { label: "Profit (demo)", value: Math.max(0, result.profit), prefix: "$" },
                    { label: "Audience Growth", value: result.audienceGrowth, prefix: "+" },
                    { label: "New Followers", value: result.newFollowers, prefix: "+" },
                    { label: "Future Booking Score", value: result.futureBookingScore, suffix: "/100" },
                  ].map((stat) => (
                    <div key={stat.label} className={cn("rounded-xl bg-white/5 p-4", stat.label === "Future Booking Score" && "col-span-2")}>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="mt-1 text-xl font-bold tabular-nums">
                        {stat.prefix ?? ""}
                        <AnimatedCounter value={stat.value} format="number" resetKey={resetKey} />
                        {stat.suffix ?? ""}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500"
                    style={{ width: `${Math.min(result.venueFilledPercent, 100)}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{result.venueFilledPercent}% of {venue.name}</p>
              </div>
              <div className="glass-panel rounded-2xl border-primary/20 p-5">
                <p className="text-sm font-semibold">Recommendation</p>
                <p className="mt-2 text-sm text-muted-foreground">{result.recommendation}</p>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
