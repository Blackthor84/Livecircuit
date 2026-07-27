"use client";

import { motion } from "framer-motion";
import {
  ARTIST_BOOKING_PRICING,
  ARENA_TIER_META,
  BOOKING_FEES,
  type ArenaTierId,
} from "@/lib/pricing/livecircuit-pricing";
import {
  calculateArtistEarnings,
  formatPricingCurrency,
} from "@/lib/pricing/artist-booking-utils";
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import { cn } from "@/lib/utils";

type Props = {
  venueId: ArenaTierId;
  ticketPrice?: number;
  expectedAttendance?: number;
  compact?: boolean;
  className?: string;
};

export function BookingPricingBreakdown({
  venueId,
  ticketPrice = 25,
  expectedAttendance,
  compact,
  className,
}: Props) {
  const venue = ARENA_TIER_META.find((t) => t.id === venueId)!;
  const attendance = expectedAttendance ?? Math.round(venue.maxCapacity * 0.4);
  const breakdown = calculateArtistEarnings({ venueId, ticketPrice, expectedAttendance: attendance });
  const resetKey = `${venueId}-${ticketPrice}-${attendance}`;

  const rows = [
    { label: "Booking Fee", value: breakdown.bookingFee, fixed: true },
    {
      label: ARTIST_BOOKING_PRICING.platformFeeLabel,
      value: breakdown.platformFee,
      note: `${ARTIST_BOOKING_PRICING.platformFeePercentage}% of ticket sales`,
    },
    {
      label: ARTIST_BOOKING_PRICING.paymentProcessingLabel,
      value: breakdown.paymentProcessing,
      note: ARTIST_BOOKING_PRICING.paymentProcessingDescription,
    },
    {
      label: ARTIST_BOOKING_PRICING.taxesLabel,
      value: breakdown.taxes,
      note: ARTIST_BOOKING_PRICING.taxesDescription,
    },
  ];

  return (
    <div className={cn("glass-panel rounded-2xl border border-white/10", compact ? "p-4" : "p-6", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Booking Pricing</p>
          <h4 className="mt-1 text-lg font-bold">{venue.name}</h4>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Booking Fee</p>
          <p className="text-xl font-bold text-emerald-400">{formatPricingCurrency(BOOKING_FEES[venueId])}</p>
          <p className="text-[10px] text-muted-foreground">per event</p>
        </div>
      </div>

      <div className="my-4 border-t border-white/10" />

      <dl className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-3 text-sm">
            <dt className="text-muted-foreground">
              {row.label}
              {row.note ? <span className="mt-0.5 block text-[10px]">{row.note}</span> : null}
            </dt>
            <dd className="shrink-0 font-semibold tabular-nums">
              {row.fixed ? formatPricingCurrency(row.value) : formatPricingCurrency(Math.round(row.value))}
            </dd>
          </div>
        ))}
      </dl>

      <div className="my-4 border-t border-white/10" />

      <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
        <span className="text-sm font-semibold text-emerald-400">Estimated Net Earnings</span>
        <span className="text-lg font-bold tabular-nums text-emerald-400">
          $<AnimatedCounter value={Math.round(breakdown.estimatedNetEarnings)} format="number" resetKey={resetKey} />
        </span>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Based on {attendance.toLocaleString()} tickets at {formatPricingCurrency(ticketPrice)} each
      </p>
    </div>
  );
}

export function BookingPricingBreakdownGrid({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {ARENA_TIER_META.map((tier, i) => (
        <motion.div
          key={tier.id}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.05 }}
        >
          <BookingPricingBreakdown venueId={tier.id} compact />
        </motion.div>
      ))}
    </div>
  );
}
