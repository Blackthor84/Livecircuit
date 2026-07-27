"use client";

import { FEE_GUIDE_ITEMS, BOOKING_FEE_BY_VENUE } from "@/lib/demo/artist-success-center-data";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { SectionHeader } from "@/components/artists/success-center/section-header";
import {
  ArtistNoSubscriptionMessage,
  ArtistPricingTransparency,
  BookingFeeExplainer,
} from "@/components/pricing/artist/booking-fee-explainer";

export function FeeGuideSection() {
  return (
    <section id="fee-guide" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <SectionHeader eyebrow="Step 9" title="LiveCircuit Fees"
          description="Everything is free until you book and sell — clear pricing from our central config." />

        <FadeUp>
          <ArtistNoSubscriptionMessage />
        </FadeUp>

        <FadeUp>
          <div className="glass-panel overflow-hidden rounded-3xl">
            {FEE_GUIDE_ITEMS.map((item, i) => (
              <div key={item.item}
                className="flex flex-col gap-1 border-b border-white/5 px-6 py-5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{item.item}</p>
                  <p className="text-sm text-muted-foreground">{item.note}</p>
                </div>
                <p className={`shrink-0 text-lg font-bold ${i < 6 ? "text-emerald-400" : "text-primary"}`}>{item.cost}</p>
              </div>
            ))}
          </div>
        </FadeUp>

        <FadeUp>
          <div className="glass-panel rounded-2xl p-6">
            <p className="mb-4 text-sm font-semibold">Booking Fees by Venue</p>
            <dl className="space-y-2">
              {BOOKING_FEE_BY_VENUE.map((row) => (
                <div key={row.venueId} className="flex justify-between border-b border-white/5 pb-2 text-sm">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="font-bold text-primary">{row.fee} / event</dd>
                </div>
              ))}
            </dl>
          </div>
        </FadeUp>

        <FadeUp>
          <BookingFeeExplainer />
        </FadeUp>

        <FadeUp>
          <ArtistPricingTransparency />
        </FadeUp>
      </div>
    </section>
  );
}
