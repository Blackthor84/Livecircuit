import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VenueConcourseExperience } from "@/components/venues/venue-concourse-experience";
import { VenueThemeHeroOverlay, VenueThemeShell } from "@/components/venues/venue-theme-shell";
import { getSessionUser } from "@/lib/auth/session";
import { getVenueConcoursePage } from "@/lib/data/concourse";
import { getActiveVenueTheme } from "@/lib/data/venue-themes";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ event?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getVenueConcoursePage(slug);
  if (!data) return { title: "Concourse" };
  return {
    title: `Concourse · ${data.venue.name}`,
    description: `Digital concourse at ${data.venue.name} — shops, sponsors, and show entrances.`,
  };
}

export default async function VenueConcoursePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { event: highlightEventId } = await searchParams;
  const [data, theme] = await Promise.all([
    getVenueConcoursePage(slug),
    getActiveVenueTheme(slug),
  ]);
  if (!data) notFound();

  const user = await getSessionUser();

  const hero =
    data.venue.hero_image_url ??
    data.venue.banner_url ??
    `https://picsum.photos/seed/concourse-${data.venue.slug}/1920/600`;

  return (
    <VenueThemeShell theme={theme} venueSlug={slug}>
      <div className="relative h-40 sm:h-52">
        <Image src={hero} alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <VenueThemeHeroOverlay />
        <div className="absolute bottom-4 left-4">
          <Link
            href={`/livecircuit/venues/${slug}`}
            className="text-sm text-white/80 hover:text-white"
          >
            ← {data.venue.name}
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <VenueConcourseExperience
          data={data}
          highlightEventId={highlightEventId ?? null}
          userSignedIn={Boolean(user)}
        />
      </div>
    </VenueThemeShell>
  );
}
