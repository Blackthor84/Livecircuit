import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VenueCommunityExperience } from "@/components/venues/venue-community-experience";
import { VenueThemeShell } from "@/components/venues/venue-theme-shell";
import { getSessionUser } from "@/lib/auth/session";
import { getVenueCommunityPage } from "@/lib/data/venue-community";
import { getVenueLoyaltyPage } from "@/lib/data/venue-loyalty";
import { getActiveVenueTheme } from "@/lib/data/venue-themes";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getVenueCommunityPage(slug);
  if (!data) return { title: "Community" };
  return {
    title: `${data.venue.name} community · LiveCircuit`,
    description: `Discussions, reviews, and rankings for ${data.venue.name}.`,
  };
}

export default async function VenueCommunityPage({ params }: Props) {
  const { slug } = await params;
  const user = await getSessionUser();
  const [data, loyalty, theme] = await Promise.all([
    getVenueCommunityPage(slug, user?.id),
    getVenueLoyaltyPage(slug, user?.id),
    getActiveVenueTheme(slug),
  ]);
  if (!data || !loyalty) notFound();

  return (
    <VenueThemeShell theme={theme} venueSlug={slug}>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href={`/livecircuit/venues/${slug}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {data.venue.name}
      </Link>
      <div className="mt-6">
        <VenueCommunityExperience data={data} loyalty={loyalty} userSignedIn={Boolean(user)} />
      </div>
      </div>
    </VenueThemeShell>
  );
}
