"use client";

import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ARTIST_BOOKING_PRICING } from "@/lib/pricing/livecircuit-pricing";
import { cn } from "@/lib/utils";

export function BookingFeeExplainer({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const { bookingFeeExplainer } = ARTIST_BOOKING_PRICING;

  return (
    <div className={cn("glass-panel rounded-2xl border border-white/10", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="font-semibold">{bookingFeeExplainer.title}</span>
        <ChevronDown className={cn("size-5 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <ul className="grid gap-2 border-t border-white/10 px-5 py-4 sm:grid-cols-2">
              {bookingFeeExplainer.items.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function ArtistNoSubscriptionMessage({ className }: { className?: string }) {
  const { noSubscriptionMessage } = ARTIST_BOOKING_PRICING;

  return (
    <div
      className={cn(
        "rounded-2xl border border-primary/30 bg-primary/10 px-6 py-5 text-center",
        className
      )}
    >
      <p className="text-lg font-bold text-primary">{noSubscriptionMessage.headline}</p>
      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
        {noSubscriptionMessage.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

export function ArtistPricingTransparency({ className }: { className?: string }) {
  return (
    <p className={cn("text-center text-sm leading-relaxed text-muted-foreground", className)}>
      {ARTIST_BOOKING_PRICING.transparencyMessage}
    </p>
  );
}
