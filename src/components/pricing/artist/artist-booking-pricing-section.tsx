"use client";

import { BookingPricingBreakdown } from "@/components/pricing/artist/booking-pricing-breakdown";
import {
  ArtistNoSubscriptionMessage,
  ArtistPricingTransparency,
  BookingFeeExplainer,
} from "@/components/pricing/artist/booking-fee-explainer";
import { ArtistEarningsCalculator } from "@/components/pricing/artist/artist-earnings-calculator";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { SectionHeader } from "@/components/artists/success-center/section-header";
import type { ArtistVenueId } from "@/lib/demo/artist-success-center-data";

type Props = {
  venueId?: ArtistVenueId;
  ticketPrice?: number;
  expectedAttendance?: number;
};

export function ArtistBookingPricingSection({ venueId, ticketPrice, expectedAttendance }: Props) {
  return (
    <section id="artist-booking-pricing" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-12">
        <SectionHeader
          eyebrow="Pricing"
          title="Artist Booking Pricing"
          description="Free to join. Pay only when you book a digital venue and sell tickets."
        />

        <FadeUp>
          <ArtistNoSubscriptionMessage />
        </FadeUp>

        {venueId ? (
          <FadeUp>
            <BookingPricingBreakdown
              venueId={venueId}
              ticketPrice={ticketPrice}
              expectedAttendance={expectedAttendance}
            />
          </FadeUp>
        ) : null}

        <FadeUp>
          <BookingFeeExplainer />
        </FadeUp>

        <FadeUp>
          <ArtistEarningsCalculator
            defaultVenueId={venueId}
            defaultTicketPrice={ticketPrice}
            defaultAttendance={expectedAttendance}
          />
        </FadeUp>

        <FadeUp>
          <ArtistPricingTransparency />
        </FadeUp>
      </div>
    </section>
  );
}
