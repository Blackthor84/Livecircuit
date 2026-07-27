"use client";

import { useMemo, useState } from "react";
import { ARTIST_VENUE_GUIDES, type ArtistVenueId } from "@/lib/demo/artist-success-center-data";
import { calculateWhatIf } from "@/lib/demo/artist-success-center-utils";
import { useSuccessCenter } from "@/components/artists/success-center/success-center-context";
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";

export function WhatIfPanel() {
  const { audience, performerType, venueMatch } = useSuccessCenter();
  const [ticketPrice, setTicketPrice] = useState(venueMatch.recommendedPrice);
  const [expectedAttendance, setExpectedAttendance] = useState(venueMatch.expectedAttendance);
  const [marketingBudget, setMarketingBudget] = useState(500);
  const [venueId, setVenueId] = useState<ArtistVenueId>(venueMatch.venue.id);

  const resetKey = `${ticketPrice}-${expectedAttendance}-${marketingBudget}-${venueId}`;

  const result = useMemo(
    () =>
      calculateWhatIf({
        audience,
        performerType,
        venueId,
        ticketPrice,
        expectedAttendance,
        marketingBudget,
      }),
    [audience, performerType, venueId, ticketPrice, expectedAttendance, marketingBudget]
  );

  const venue = ARTIST_VENUE_GUIDES.find((v) => v.id === venueId)!;

  return (
    <section id="what-if" className="scroll-mt-24 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <FadeUp>
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">What If?</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Instant Scenario Simulator</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              Adjust ticket price, attendance, and marketing spend to see how changes affect revenue and venue fit.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="glass-panel space-y-5 rounded-3xl p-6">
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Venue</legend>
                <select value={venueId} onChange={(e) => setVenueId(e.target.value as ArtistVenueId)}
                  className="w-full rounded-xl border border-white/10 bg-background/60 px-4 py-2.5 text-sm outline-none">
                  {ARTIST_VENUE_GUIDES.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </fieldset>
              {[
                { label: "Ticket Price", value: ticketPrice, min: 5, max: 300, step: 1, set: setTicketPrice, display: `$${ticketPrice}` },
                { label: "Expected Attendance", value: expectedAttendance, min: 25, max: venue.capacity, step: 25, set: setExpectedAttendance, display: expectedAttendance.toLocaleString() },
                { label: "Marketing Budget", value: marketingBudget, min: 0, max: 10000, step: 100, set: setMarketingBudget, display: `$${marketingBudget.toLocaleString()}` },
              ].map((s) => (
                <fieldset key={s.label}>
                  <legend className="mb-2 text-sm font-semibold">{s.label}: <span className="text-primary">{s.display}</span></legend>
                  <input type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                    onChange={(e) => s.set(Number(e.target.value))} className="w-full accent-primary" />
                </fieldset>
              ))}
            </div>

            <div className="glass-panel rounded-3xl border-primary/20 p-6 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Projected Impact</p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                {[
                  { label: "Gross Revenue", value: result.grossRevenue, prefix: "$" },
                  { label: "Net Earnings", value: Math.round(result.netEarnings), prefix: "$" },
                  { label: "Venue Fill", value: result.venueFillPercent, suffix: "%" },
                  { label: "Fit Impact", value: result.fitImpact, suffix: "/100" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-white/5 p-4">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-xl font-bold tabular-nums">
                      {stat.prefix ?? ""}
                      <AnimatedCounter value={stat.value} format="number" resetKey={resetKey} />
                      {stat.suffix ?? ""}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-6 rounded-xl bg-primary/10 p-4 text-sm text-primary/90">{result.summary}</p>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
