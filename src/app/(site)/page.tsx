import type { Metadata } from "next";
import { MarketingHomepage } from "@/components/home/marketing-homepage";
import { PlatformPartnersStrip } from "@/components/sponsorship/platform-partners-strip";
import { VenueSponsorBanner } from "@/components/venues/venue-sponsor-banner";
import { FeaturedVenuesSection } from "@/components/home/featured-venues-section";
import { getViewerFeatureAccess } from "@/lib/features/guard";
import {
  getFeaturedArtists,
  getLiveNowEvents,
  getPublicArtistCount,
  getUpcomingEvents,
} from "@/lib/data/queries";
import { getFeaturedVenuesForHome } from "@/lib/data/venues";
import { getPlatformHomepageSponsorBanner } from "@/lib/data/sponsors";
import { HOMEPAGE_SEO_KEYWORDS } from "@/lib/home/marketing-content";
import { DIGITAL_TOURING_BRAND } from "@/lib/home/digital-touring-content";
import { listPlatformSponsors } from "@/lib/sponsorship/inventory";
import { getLiveTourSnapshots } from "@/lib/touring/tour-context";
import { getHomepageTouringPayload } from "@/lib/touring/homepage-data";
import { buildVenueBookingFeesDisplay } from "@/lib/monetization/build-content.server";
import { getMonetizationSnapshot } from "@/lib/monetization/pricing-resolver.server";

export const metadata: Metadata = {
  title: DIGITAL_TOURING_BRAND.heroHeadline,
  description:
    "LiveCircuit — the world's first Digital Touring Platform. Artists perform digital tours across cities, states, and countries. Fans follow the route in real time.",
  keywords: [...HOMEPAGE_SEO_KEYWORDS],
  openGraph: {
    title: `LiveCircuit — ${DIGITAL_TOURING_BRAND.platformName}`,
    description:
      "Digital tours across cities, states, and countries. The tour is the product — streaming powers the experience.",
  },
};

export default async function HomePage() {
  const [
    artists,
    upcomingEvents,
    liveEvents,
    foundingArtistCount,
    homepageSponsor,
    featureAccess,
    featuredVenues,
    platformSponsors,
    liveTourSnapshots,
    touring,
    monetizationSnapshot,
  ] = await Promise.all([
    getFeaturedArtists(4),
    getUpcomingEvents(6),
    getLiveNowEvents(4),
    getPublicArtistCount(),
    getPlatformHomepageSponsorBanner(),
    getViewerFeatureAccess(),
    getFeaturedVenuesForHome(6),
    listPlatformSponsors(),
    getLiveTourSnapshots(2),
    getHomepageTouringPayload(),
    getMonetizationSnapshot(),
  ]);

  const showSponsor = featureAccess.canAccess("sponsorships");
  const showTicketing = featureAccess.canAccess("ticketing");

  return (
    <>
      {showSponsor && platformSponsors.length > 0 ? (
        <PlatformPartnersStrip sponsors={platformSponsors} />
      ) : null}

      <MarketingHomepage
        liveEvents={liveEvents}
        artists={artists}
        upcomingEvents={upcomingEvents}
        foundingArtistCount={foundingArtistCount}
        showTicketing={showTicketing}
        liveTourSnapshots={liveTourSnapshots}
        touring={touring}
        venueFees={buildVenueBookingFeesDisplay(monetizationSnapshot)}
      />

      {homepageSponsor && showSponsor ? (
        <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
          <VenueSponsorBanner
            title={homepageSponsor.name}
            subtitle={homepageSponsor.organization_name ?? "LiveCircuit partner"}
            imageUrl={homepageSponsor.asset_url}
            href={homepageSponsor.click_url}
            advertisementId={homepageSponsor.advertisement_id}
            billboardId={homepageSponsor.billboard_id}
          />
        </section>
      ) : null}

      <FeaturedVenuesSection venues={featuredVenues} />
    </>
  );
}
