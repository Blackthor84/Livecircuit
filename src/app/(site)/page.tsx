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
  getPublishedTours,
  getUpcomingEvents,
} from "@/lib/data/queries";
import { getFeaturedVenuesForHome } from "@/lib/data/venues";
import { getPlatformHomepageSponsorBanner } from "@/lib/data/sponsors";
import { HOMEPAGE_SEO_KEYWORDS } from "@/lib/home/marketing-content";
import { DIGITAL_TOURING_BRAND } from "@/lib/home/digital-touring-content";
import { listPlatformSponsors } from "@/lib/sponsorship/inventory";
import { getActiveTourMapCities, getLiveTourSnapshots } from "@/lib/touring/tour-context";

export const metadata: Metadata = {
  title: DIGITAL_TOURING_BRAND.heroHeadline,
  description:
    "LiveCircuit — the world's first Digital Touring Platform. Create multi-city digital tours with real cities, real arenas, and real audiences. Fans follow tours, not streams.",
  keywords: [...HOMEPAGE_SEO_KEYWORDS],
  openGraph: {
    title: `LiveCircuit — ${DIGITAL_TOURING_BRAND.platformName}`,
    description:
      "Digital tours across cities, states, and countries. The tour is the product — streaming is just the technology that powers it.",
  },
};

export default async function HomePage() {
  const [
    artists,
    tours,
    upcomingEvents,
    liveEvents,
    foundingArtistCount,
    homepageSponsor,
    featureAccess,
    featuredVenues,
    platformSponsors,
    liveTourSnapshots,
    activeMapCities,
  ] = await Promise.all([
    getFeaturedArtists(4),
    getPublishedTours(6),
    getUpcomingEvents(4),
    getLiveNowEvents(4),
    getPublicArtistCount(),
    getPlatformHomepageSponsorBanner(),
    getViewerFeatureAccess(),
    getFeaturedVenuesForHome(6),
    listPlatformSponsors(),
    getLiveTourSnapshots(2),
    getActiveTourMapCities(12),
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
        tours={tours}
        upcomingEvents={upcomingEvents}
        foundingArtistCount={foundingArtistCount}
        showTicketing={showTicketing}
        liveTourSnapshots={liveTourSnapshots}
        activeMapCities={activeMapCities}
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
