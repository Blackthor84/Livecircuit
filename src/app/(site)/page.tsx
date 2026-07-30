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
import { listPlatformSponsors } from "@/lib/sponsorship/inventory";

export const metadata: Metadata = {
  title: "The Future of Live Entertainment",
  description:
    "LiveCircuit — ticketed livestreams, virtual concerts, comedy, podcasts, and interactive creator experiences. Watch live music and performances from anywhere in the world.",
  keywords: [...HOMEPAGE_SEO_KEYWORDS],
  openGraph: {
    title: "LiveCircuit — The Future of Live Entertainment",
    description:
      "Ticketed livestreams, virtual concerts, comedy, podcasts, and the creator economy — built for authentic live performance.",
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
  ] = await Promise.all([
    getFeaturedArtists(4),
    getPublishedTours(3),
    getUpcomingEvents(4),
    getLiveNowEvents(4),
    getPublicArtistCount(),
    getPlatformHomepageSponsorBanner(),
    getViewerFeatureAccess(),
    getFeaturedVenuesForHome(6),
    listPlatformSponsors(),
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
