"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ARENA_TIER_META, type ArenaTierId } from "@/lib/pricing/livecircuit-pricing";
import {
  calculateArtistEarnings,
  formatPricingCurrency,
} from "@/lib/pricing/artist-booking-utils";
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import { cn } from "@/lib/utils";

type Props = {
  defaultVenueId?: ArenaTierId;
  defaultTicketPrice?: number;
  defaultAttendance?: number;
  className?: string;
};

export function ArtistEarningsCalculator({
  defaultVenueId = "club",
  defaultTicketPrice = 25,
  defaultAttendance = 500,
  className,
}: Props) {
  const venue = ARENA_TIER_META.find((t) => t.id === defaultVenueId)!;
  const [venueId, setVenueId] = useState<ArenaTierId>(defaultVenueId);
  const [ticketPrice, setTicketPrice] = useState(defaultTicketPrice);
  const [expectedAttendance, setExpectedAttendance] = useState(defaultAttendance);

  const selectedVenue = ARENA_TIER_META.find((t) => t.id === venueId)!;
  const resetKey = `${venueId}-${ticketPrice}-${expectedAttendance}`;

  const result = useMemo(
    () => calculateArtistEarnings({ venueId, ticketPrice, expectedAttendance }),
    [venueId, ticketPrice, expectedAttendance]
  );

  const outputs = [
    { label: "Gross Revenue", value: result.grossRevenue, highlight: false },
    { label: "Booking Fee", value: result.bookingFee, muted: true },
    { label: "Platform Fee", value: result.platformFee, muted: true },
    { label: "Payment Processing", value: result.paymentProcessing, muted: true },
    { label: "Estimated Taxes", value: result.taxes, muted: true },
    { label: "Estimated Net Earnings", value: result.estimatedNetEarnings, highlight: true },
    { label: "Break-even Ticket Count", value: result.breakEvenTicketCount, suffix: " tickets" },
    { label: "Venue Fill %", value: result.venueFillPercent, suffix: "%" },
  ];

  return (
    <div className={cn("grid gap-8 lg:grid-cols-2", className)}>
      <div className="glass-panel space-y-6 rounded-3xl p-6 sm:p-8">
        <h3 className="text-lg font-bold">Estimated Earnings Calculator</h3>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Venue</legend>
          <select
            value={venueId}
            onChange={(e) => setVenueId(e.target.value as ArenaTierId)}
            className="w-full rounded-xl border border-white/10 bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary/50"
          >
            {ARENA_TIER_META.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </fieldset>
        {[
          {
            label: "Ticket Price",
            value: ticketPrice,
            min: 5,
            max: 300,
            step: 1,
            set: setTicketPrice,
            display: formatPricingCurrency(ticketPrice),
          },
          {
            label: "Expected Attendance",
            value: expectedAttendance,
            min: 25,
            max: selectedVenue.maxCapacity,
            step: 25,
            set: setExpectedAttendance,
            display: expectedAttendance.toLocaleString(),
          },
        ].map((s) => (
          <fieldset key={s.label}>
            <legend className="mb-2 text-sm font-semibold">
              {s.label}: <span className="text-primary">{s.display}</span>
            </legend>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={s.value}
              onChange={(e) => s.set(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </fieldset>
        ))}
      </div>

      <motion.div
        className="glass-panel rounded-3xl p-6 sm:p-8"
        key={resetKey}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <dl className="space-y-4">
          {outputs.map((row) => (
            <div key={row.label} className="flex justify-between border-b border-white/5 pb-3">
              <dt className={cn("text-sm", row.muted && "text-muted-foreground")}>{row.label}</dt>
              <dd
                className={cn(
                  "font-bold tabular-nums",
                  row.highlight && "text-lg text-emerald-400"
                )}
              >
                {row.suffix ? (
                  <>
                    <AnimatedCounter value={Math.round(row.value)} format="number" resetKey={resetKey} />
                    {row.suffix}
                  </>
                ) : (
                  <>${<AnimatedCounter value={Math.round(row.value)} format="number" resetKey={resetKey} />}</>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </motion.div>
    </div>
  );
}
