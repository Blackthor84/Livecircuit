"use client";

import { motion } from "framer-motion";
import {
  ARENA_TIER_META,
  STADIUM_BOOKING,
  type ArenaTierId,
} from "@/lib/pricing/livecircuit-pricing";
import {
  calculateArtistEarnings,
  formatPricingCurrency,
} from "@/lib/pricing/artist-booking-utils";
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import { useOptionalSuccessCenter } from "@/components/artists/success-center/success-center-context";
import { formatBookingFeeFromSnapshot } from "@/lib/monetization/pricing-utils";
import { resolveVenuePriceSync } from "@/lib/business-rules/pricing-client";
import type { MonetizationSnapshot } from "@/lib/monetization/types";
import { cn } from "@/lib/utils";

type Props = {
  venueId: ArenaTierId;
  ticketPrice?: number;
  expectedAttendance?: number;
  compact?: boolean;
  className?: string;
  pricingSnapshot?: MonetizationSnapshot;
};

export function BookingPricingBreakdown({
  venueId,
  ticketPrice = 25,
  expectedAttendance,
  compact,
  className,
  pricingSnapshot,
}: Props) {
  const ctx = useOptionalSuccessCenter();
  const snapshot = pricingSnapshot ?? ctx?.pricingSnapshot;
  const rulesSnapshot = ctx?.rulesSnapshot;
  if (!snapshot) {
    throw new Error("BookingPricingBreakdown requires pricingSnapshot or SuccessCenterProvider");
  }

  const artistPricing = ctx?.artistPricing;
  const venue = ARENA_TIER_META.find((t) => t.id === venueId)!;
  const attendance = expectedAttendance ?? Math.round(venue.maxCapacity * 0.4);
  const breakdown = calculateArtistEarnings({
    venueId,
    ticketPrice,
    expectedAttendance: attendance,
    snapshot,
    rulesSnapshot,
    ruleContext: { userType: "artist", artistStatus: ["new"], eventCount: 0 },
  });
  const resetKey = `${venueId}-${ticketPrice}-${attendance}`;

  const venuePriceResolved = rulesSnapshot
    ? resolveVenuePriceSync(snapshot, rulesSnapshot, {
        userType: "artist",
        venueType: venueId,
        eventCount: 0,
      })
    : null;

  const rows = [
    { label: "Booking Fee", value: breakdown.bookingFee, fixed: true },
    {
      label: artistPricing?.platformFeeLabel ?? "Digital Ticketing Fee",
      value: breakdown.platformFee,
      note: `${snapshot.tickets.platformFeePercent}% of digital ticket sales only`,
    },
    {
      label: artistPricing?.paymentProcessingLabel ?? "Payment Processing",
      value: breakdown.paymentProcessing,
      note: artistPricing?.paymentProcessingDescription,
    },
    {
      label: artistPricing?.taxesLabel ?? "Taxes",
      value: breakdown.taxes,
      note: artistPricing?.taxesDescription,
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
          <p className="text-xl font-bold text-emerald-400">
            {venueId === "stadium"
              ? STADIUM_BOOKING.headline
              : venuePriceResolved
                ? venuePriceResolved.isFree
                  ? "FREE"
                  : `$${(venuePriceResolved.feeCents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                : formatBookingFeeFromSnapshot(snapshot, venueId)}
          </p>
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

export function BookingPricingBreakdownGrid({
  className,
  pricingSnapshot,
}: {
  className?: string;
  pricingSnapshot: MonetizationSnapshot;
}) {
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
          <BookingPricingBreakdown venueId={tier.id} compact pricingSnapshot={pricingSnapshot} />
        </motion.div>
      ))}
    </div>
  );
}
